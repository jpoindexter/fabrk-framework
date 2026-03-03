import { describe, it, expect, vi } from 'vitest';
import { createToolExecutor } from '../agents/tool-executor';
import type { ToolDefinition } from '../tools/define-tool';
import { createApprovalHandler, getAgentApprovals, pendingApprovals } from '../agents/approval-handler';

function makeApprovalTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'myTool',
    description: 'test',
    schema: { type: 'object', properties: {} },
    handler: async () => ({ content: [{ type: 'text', text: 'result' }] }),
    requiresApproval: true,
    ...overrides,
  };
}

describe('human-in-the-loop tool approval', () => {
  it('tool with requiresApproval triggers onApprovalRequired hook before execution', async () => {
    const approvalHook = vi.fn().mockResolvedValue({ approved: true });
    const handlerSpy = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result' }] });
    const executor = createToolExecutor(
      [makeApprovalTool({ handler: handlerSpy })],
      { onApprovalRequired: approvalHook }
    );
    await executor.execute('myTool', {});
    expect(approvalHook).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledOnce();
  });

  it('approved: true allows handler to run and returns output', async () => {
    const executor = createToolExecutor(
      [makeApprovalTool({
        name: 'greet',
        handler: async () => ({ content: [{ type: 'text', text: 'hello world' }] }),
      })],
      {
        onApprovalRequired: vi.fn().mockResolvedValue({ approved: true }),
      }
    );
    const result = await executor.execute('greet', {});
    expect(result.output).toBe('hello world');
  });

  it('approved: true with modifiedInput passes modified input to handler', async () => {
    const handlerSpy = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    const executor = createToolExecutor(
      [makeApprovalTool({ handler: handlerSpy })],
      {
        onApprovalRequired: vi.fn().mockResolvedValue({
          approved: true,
          modifiedInput: { extra: 'added' },
        }),
      }
    );
    await executor.execute('myTool', { original: 'value' });
    expect(handlerSpy).toHaveBeenCalledWith({ original: 'value', extra: 'added' });
  });

  it('approved: false throws rejection error', async () => {
    const handlerSpy = vi.fn();
    const executor = createToolExecutor(
      [makeApprovalTool({ name: 'dangerous', handler: handlerSpy })],
      {
        onApprovalRequired: vi.fn().mockResolvedValue({ approved: false }),
      }
    );
    await expect(executor.execute('dangerous', {})).rejects.toThrow(
      'Tool execution rejected by user: dangerous'
    );
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('tool without requiresApproval never calls onApprovalRequired', async () => {
    const approvalHook = vi.fn().mockResolvedValue({ approved: true });
    const executor = createToolExecutor(
      [{
        name: 'normal',
        description: 'no approval needed',
        schema: { type: 'object', properties: {} },
        handler: async () => ({ content: [{ type: 'text', text: 'result' }] }),
        // no requiresApproval
      }],
      { onApprovalRequired: approvalHook }
    );
    await executor.execute('normal', {});
    expect(approvalHook).not.toHaveBeenCalled();
  });

  it('onApprovalRequired receives toolName, input, and a UUID approvalId', async () => {
    const approvalHook = vi.fn().mockResolvedValue({ approved: true });
    const executor = createToolExecutor(
      [makeApprovalTool()],
      { onApprovalRequired: approvalHook }
    );
    await executor.execute('myTool', { foo: 'bar' });
    const [toolName, input, approvalId] = approvalHook.mock.calls[0];
    expect(toolName).toBe('myTool');
    expect(input).toEqual({ foo: 'bar' });
    expect(typeof approvalId).toBe('string');
    expect(approvalId.length).toBeGreaterThan(0);
  });

  describe('createApprovalHandler', () => {
    const approvalHandlerInstance = createApprovalHandler();

    it('returns 404 for unknown approvalId', async () => {
      const req = new Request('http://localhost/__ai/agents/myAgent/approve', {
        method: 'POST',
        body: JSON.stringify({ approvalId: 'nonexistent-id', approved: true }),
      });
      const resp = await approvalHandlerInstance(req, 'myAgent');
      expect(resp.status).toBe(404);
    });

    it('returns 400 for missing approved field', async () => {
      const req = new Request('http://localhost/__ai/agents/myAgent/approve', {
        method: 'POST',
        body: JSON.stringify({ approvalId: 'some-id' }), // missing approved
      });
      const resp = await approvalHandlerInstance(req, 'myAgent');
      expect(resp.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost/__ai/agents/myAgent/approve', {
        method: 'POST',
        body: 'not json',
      });
      const resp = await approvalHandlerInstance(req, 'myAgent');
      expect(resp.status).toBe(400);
    });

    it('returns 405 for non-POST', async () => {
      const req = new Request('http://localhost/__ai/agents/myAgent/approve', {
        method: 'GET',
      });
      const resp = await approvalHandlerInstance(req, 'myAgent');
      expect(resp.status).toBe(405);
    });

    it('resolves pending approval and cleans up entry', async () => {
      const agentApprovals = getAgentApprovals('testAgent');
      const approvalId = 'test-approval-123';
      let resolved = false;
      const promise = new Promise<{ approved: boolean }>((resolve) => {
        agentApprovals.set(approvalId, {
          resolve: (result) => {
            resolved = true;
            resolve(result);
          },
          toolName: 'testTool',
        });
      });

      const req = new Request('http://localhost/__ai/agents/testAgent/approve', {
        method: 'POST',
        body: JSON.stringify({ approvalId, approved: true }),
      });
      const resp = await approvalHandlerInstance(req, 'testAgent');
      const result = await promise;

      expect(resp.status).toBe(200);
      expect(resolved).toBe(true);
      expect(result.approved).toBe(true);
      // Entry should be cleaned up
      expect(agentApprovals.has(approvalId)).toBe(false);
    });

    it('denied approval resolves with approved: false and no modifiedInput', async () => {
      const agentApprovals = getAgentApprovals('denyAgent');
      const approvalId = 'deny-approval-456';
      let resolvedValue: { approved: boolean; modifiedInput?: Record<string, unknown> } | null = null;

      const promise = new Promise<void>((resolve) => {
        agentApprovals.set(approvalId, {
          resolve: (result) => {
            resolvedValue = result;
            resolve();
          },
          toolName: 'dangerousTool',
        });
      });

      const req = new Request('http://localhost/__ai/agents/denyAgent/approve', {
        method: 'POST',
        body: JSON.stringify({ approvalId, approved: false }),
      });
      const resp = await approvalHandlerInstance(req, 'denyAgent');
      await promise;

      expect(resp.status).toBe(200);
      expect(resolvedValue!.approved).toBe(false);
      expect(resolvedValue!.modifiedInput).toBeUndefined();
    });

    it('response includes security headers', async () => {
      const req = new Request('http://localhost/__ai/agents/myAgent/approve', {
        method: 'POST',
        body: JSON.stringify({ approvalId: 'no-such-id', approved: true }),
      });
      const resp = await approvalHandlerInstance(req, 'myAgent');
      expect(resp.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});
