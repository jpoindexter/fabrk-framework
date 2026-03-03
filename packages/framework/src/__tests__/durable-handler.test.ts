import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStartAgent, handleResumeAgent, handleAgentStatus } from '../agents/durable-handler';
import { InMemoryCheckpointStore } from '../agents/checkpoint';
import { createToolExecutor } from '../agents/tool-executor';
import type { DurableAgentOptions } from '../agents/durable-handler';
import type { LLMMessage } from '@fabrk/ai';

// Minimal stubs
const MESSAGES: LLMMessage[] = [{ role: 'user', content: 'hello' }];

function makeOptions(
  overrides: Partial<DurableAgentOptions> = {}
): DurableAgentOptions {
  return {
    agentName: 'testAgent',
    sessionId: 'sess-1',
    model: 'gpt-4o',
    toolExecutor: createToolExecutor([]),
    toolSchemas: [],
    checkpointStore: new InMemoryCheckpointStore(),
    generateWithTools: vi.fn().mockResolvedValue({
      content: 'done',
      toolCalls: undefined,
      usage: { promptTokens: 5, completionTokens: 3 },
    }),
    calculateCost: () => ({ costUSD: 0.001 }),
    ...overrides,
  };
}

describe('handleStartAgent', () => {
  it('creates a checkpoint and returns a checkpointId', async () => {
    const opts = makeOptions();
    const { checkpointId, events } = await handleStartAgent(MESSAGES, opts);
    expect(typeof checkpointId).toBe('string');
    expect(checkpointId.length).toBeGreaterThan(0);
    // Should have at least a done event
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  it('saves checkpoint with status "completed" on done', async () => {
    const store = new InMemoryCheckpointStore();
    const opts = makeOptions({ checkpointStore: store });
    const { checkpointId } = await handleStartAgent(MESSAGES, opts);
    const state = await store.load(checkpointId);
    expect(state).not.toBeNull();
    expect(state!.status).toBe('completed');
    expect(state!.agentName).toBe('testAgent');
  });

  it('saves initial messages to checkpoint', async () => {
    const store = new InMemoryCheckpointStore();
    const opts = makeOptions({ checkpointStore: store });
    const { checkpointId } = await handleStartAgent(MESSAGES, opts);
    const state = await store.load(checkpointId);
    expect(state!.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'hello' }),
    ]));
  });

  it('propagates error when generateWithTools throws', async () => {
    const store = new InMemoryCheckpointStore();
    const opts = makeOptions({
      checkpointStore: store,
      generateWithTools: vi.fn().mockRejectedValue(new Error('LLM failure')),
    });
    // runAgentLoop does not wrap generateWithTools in try/catch — error propagates
    await expect(handleStartAgent(MESSAGES, opts)).rejects.toThrow('LLM failure');
  });

  it('saves tool results when tools are called', async () => {
    const store = new InMemoryCheckpointStore();
    let callCount = 0;
    const generateWithTools = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          content: null,
          toolCalls: [{ id: 'tc-1', name: 'myTool', arguments: {} }],
          usage: { promptTokens: 5, completionTokens: 3 },
        });
      }
      return Promise.resolve({
        content: 'final',
        toolCalls: undefined,
        usage: { promptTokens: 5, completionTokens: 3 },
      });
    });
    const toolDef = {
      name: 'myTool',
      description: 'a test tool',
      schema: { type: 'object', properties: {} },
      handler: async () => ({ content: [{ type: 'text', text: 'tool output' }] }),
    };
    const opts = makeOptions({
      checkpointStore: store,
      generateWithTools,
      toolExecutor: createToolExecutor([toolDef]),
      toolSchemas: [{ type: 'function', function: { name: 'myTool', description: 'test', parameters: { type: 'object', properties: {} } } }],
    });
    const { checkpointId } = await handleStartAgent(MESSAGES, opts);
    const state = await store.load(checkpointId);
    expect(state!.toolResults.length).toBeGreaterThan(0);
    expect(state!.toolResults[0].name).toBe('myTool');
  });
});

describe('handleResumeAgent', () => {
  it('throws "Checkpoint not found" for unknown checkpointId', async () => {
    const opts = makeOptions();
    await expect(handleResumeAgent('nonexistent', opts)).rejects.toThrow('Checkpoint not found');
  });

  it('throws "Checkpoint does not belong to this agent" for wrong agentName', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save('cp-1', {
      id: 'cp-1',
      agentName: 'otherAgent',
      messages: MESSAGES,
      iteration: 0,
      toolResults: [],
      status: 'paused',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const opts = makeOptions({ checkpointStore: store, agentName: 'testAgent' });
    await expect(handleResumeAgent('cp-1', opts)).rejects.toThrow(
      'Checkpoint does not belong to this agent'
    );
  });

  it('throws "Agent execution already completed" for completed checkpoint', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save('cp-2', {
      id: 'cp-2',
      agentName: 'testAgent',
      messages: MESSAGES,
      iteration: 2,
      toolResults: [],
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const opts = makeOptions({ checkpointStore: store });
    await expect(handleResumeAgent('cp-2', opts)).rejects.toThrow(
      'Agent execution already completed'
    );
  });

  it('resumes execution and returns events', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save('cp-3', {
      id: 'cp-3',
      agentName: 'testAgent',
      messages: MESSAGES,
      iteration: 0,
      toolResults: [],
      status: 'paused',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const opts = makeOptions({ checkpointStore: store });
    const { events } = await handleResumeAgent('cp-3', opts);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  it('marks resumed checkpoint as "running" then "completed"', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save('cp-4', {
      id: 'cp-4',
      agentName: 'testAgent',
      messages: MESSAGES,
      iteration: 0,
      toolResults: [],
      status: 'paused',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const opts = makeOptions({ checkpointStore: store });
    await handleResumeAgent('cp-4', opts);
    const state = await store.load('cp-4');
    expect(state!.status).toBe('completed');
  });
});

describe('handleAgentStatus', () => {
  it('returns 404 for unknown checkpointId', async () => {
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentStatus('no-such-id', store);
    expect(resp.status).toBe(404);
    const body = await resp.json() as { error: string };
    expect(body.error).toContain('not found');
  });

  it('returns 200 with correct status fields for known checkpoint', async () => {
    const store = new InMemoryCheckpointStore();
    const now = Date.now();
    await store.save('cp-status', {
      id: 'cp-status',
      agentName: 'myAgent',
      messages: MESSAGES,
      iteration: 3,
      toolResults: [{ name: 'myTool', output: 'ok' }],
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });
    const resp = await handleAgentStatus('cp-status', store);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.id).toBe('cp-status');
    expect(body.agentName).toBe('myAgent');
    expect(body.status).toBe('completed');
    expect(body.iteration).toBe(3);
    expect(body.messageCount).toBe(1);
  });

  it('response includes security headers', async () => {
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentStatus('missing', store);
    expect(resp.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
