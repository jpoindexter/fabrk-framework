import { describe, it, expect } from 'vitest';
import { stepCountIs, hasToolCall } from '../agents/stop-conditions';
import { runAgentLoop } from '../agents/agent-loop';
import { createToolExecutor } from '../agents/tool-executor';
import type { ToolDefinition } from '../tools/define-tool';

function mockTool(name: string): ToolDefinition {
  return {
    name,
    description: `Tool ${name}`,
    schema: { type: 'object', properties: {} },
    handler: async () => ({ content: [{ type: 'text', text: `${name} result` }] }),
  };
}

async function collect(gen: AsyncGenerator<unknown>) {
  const events: unknown[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

// Unit tests for condition factories
describe('stepCountIs', () => {
  it('fires when iterationCount >= n', () => {
    const c = stepCountIs(2);
    expect(c({ iterationCount: 1, lastToolCallNames: [] })).toBe(false);
    expect(c({ iterationCount: 2, lastToolCallNames: [] })).toBe(true);
    expect(c({ iterationCount: 3, lastToolCallNames: [] })).toBe(true);
  });
});

describe('hasToolCall', () => {
  it('fires on any tool when name omitted', () => {
    const c = hasToolCall();
    expect(c({ iterationCount: 0, lastToolCallNames: [] })).toBe(false);
    expect(c({ iterationCount: 1, lastToolCallNames: ['search'] })).toBe(true);
  });

  it('fires only for named tool', () => {
    const c = hasToolCall('search');
    expect(c({ iterationCount: 1, lastToolCallNames: ['fetch'] })).toBe(false);
    expect(c({ iterationCount: 1, lastToolCallNames: ['search'] })).toBe(true);
  });
});

// Integration tests using runAgentLoop
describe('runAgentLoop with stopWhen', () => {
  it('stepCountIs(1) stops after 1 tool-using iteration', async () => {
    const tool = mockTool('calc');
    const executor = createToolExecutor([tool]);
    let callCount = 0;
    const events = await collect(runAgentLoop({
      messages: [{ role: 'user', content: 'go' }],
      toolExecutor: executor,
      toolSchemas: executor.toLLMSchema(),
      agentName: 'test',
      sessionId: 's1',
      model: 'test',
      stream: false,
      stopWhen: stepCountIs(1),
      generateWithTools: async () => {
        callCount++;
        if (callCount === 1) return { content: null, toolCalls: [{ id: 'tc1', name: 'calc', arguments: {} }], usage: { promptTokens: 5, completionTokens: 5 } };
        return { content: 'Done!', usage: { promptTokens: 5, completionTokens: 5 } };
      },
      calculateCost: () => ({ costUSD: 0 }),
    }));
    // Should stop after 1 tool iteration, not continue to text
     
    const done = events.find((e: any) => e.type === 'done');
    expect(done).toBeDefined();
    // callCount should be 1 (stopped before asking LLM for text after tool)
    expect(callCount).toBe(1);
  });

  it('hasToolCall fires and stops after the named tool runs', async () => {
    const tool = mockTool('stop-me');
    const executor = createToolExecutor([tool]);
    let callCount = 0;
    const events = await collect(runAgentLoop({
      messages: [{ role: 'user', content: 'go' }],
      toolExecutor: executor,
      toolSchemas: executor.toLLMSchema(),
      agentName: 'test',
      sessionId: 's2',
      model: 'test',
      stream: false,
      stopWhen: hasToolCall('stop-me'),
      generateWithTools: async () => {
        callCount++;
        if (callCount === 1) return { content: null, toolCalls: [{ id: 'tc1', name: 'stop-me', arguments: {} }], usage: { promptTokens: 5, completionTokens: 5 } };
        return { content: 'unreachable', usage: { promptTokens: 5, completionTokens: 5 } };
      },
      calculateCost: () => ({ costUSD: 0 }),
    }));
     
    const done = events.find((e: any) => e.type === 'done');
    expect(done).toBeDefined();
    expect(callCount).toBe(1);
  });

  it('stopWhen array — any condition can stop the loop', async () => {
    const tool = mockTool('t');
    const executor = createToolExecutor([tool]);
    let callCount = 0;
    const events = await collect(runAgentLoop({
      messages: [{ role: 'user', content: 'go' }],
      toolExecutor: executor,
      toolSchemas: executor.toLLMSchema(),
      agentName: 'test',
      sessionId: 's3',
      model: 'test',
      stream: false,
      stopWhen: [stepCountIs(99), hasToolCall('t')],
      generateWithTools: async () => {
        callCount++;
        if (callCount === 1) return { content: null, toolCalls: [{ id: 'tc1', name: 't', arguments: {} }], usage: { promptTokens: 1, completionTokens: 1 } };
        return { content: 'unreachable', usage: { promptTokens: 1, completionTokens: 1 } };
      },
      calculateCost: () => ({ costUSD: 0 }),
    }));
     
    expect(events.find((e: any) => e.type === 'done')).toBeDefined();
    expect(callCount).toBe(1);
  });

  it('no-tool turn ignores stopWhen and completes normally', async () => {
    const executor = createToolExecutor([]);
    const events = await collect(runAgentLoop({
      messages: [{ role: 'user', content: 'hi' }],
      toolExecutor: executor,
      toolSchemas: [],
      agentName: 'test',
      sessionId: 's4',
      model: 'test',
      stream: false,
      stopWhen: hasToolCall('anything'),
      generateWithTools: async () => ({ content: 'Hello!', usage: { promptTokens: 5, completionTokens: 5 } }),
      calculateCost: () => ({ costUSD: 0 }),
    }));
     
    expect(events.find((e: any) => e.type === 'text')).toBeDefined();
     
    expect(events.find((e: any) => e.type === 'done')).toBeDefined();
  });
});
