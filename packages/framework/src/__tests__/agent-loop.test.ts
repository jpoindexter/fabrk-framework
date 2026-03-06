import { describe, it, expect } from "vitest";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMStreamEvent } from "@fabrk/ai";

function makeTool(name: string, handler?: ToolDefinition["handler"]): ToolDefinition {
  return {
    name,
    description: `Tool: ${name}`,
    schema: { type: "object", properties: { input: { type: "string" } } },
    handler: handler ?? (async (args) => ({
      content: [{ type: "text", text: `${name} result: ${JSON.stringify(args)}` }],
    })),
  };
}

function mockCalculateCost() {
  return (_model: string, _p: number, _c: number) => ({ costUSD: 0.001 });
}

async function collectEvents(gen: AsyncGenerator<AgentLoopEvent>): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe("runAgentLoop", () => {
  it("completes a no-tool turn", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Hi" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => ({
          content: "Hello!",
          usage: { promptTokens: 10, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const types = events.map((e) => e.type);
    expect(types).toContain("usage");
    expect(types).toContain("text");
    expect(types).toContain("done");
    expect(events.find((e) => e.type === "text")).toMatchObject({ content: "Hello!" });
  });

  it("executes single tool call then returns text", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search for cats" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              content: null,
              toolCalls: [{ id: "tc1", name: "search", arguments: { input: "cats" } }],
              usage: { promptTokens: 10, completionTokens: 5 },
            };
          }
          return {
            content: "Found results about cats!",
            usage: { promptTokens: 20, completionTokens: 10 },
          };
        },
        calculateCost: mockCalculateCost(),
      })
    );

    const types = events.map((e) => e.type);
    expect(types).toContain("tool-call");
    expect(types).toContain("tool-result");
    expect(types).toContain("text");
    expect(types).toContain("done");

    const toolCall = events.find((e) => e.type === "tool-call") as Extract<AgentLoopEvent, { type: "tool-call" }>;
    expect(toolCall.name).toBe("search");
    expect(toolCall.iteration).toBe(0);

    const toolResult = events.find((e) => e.type === "tool-result") as Extract<AgentLoopEvent, { type: "tool-result" }>;
    expect(toolResult.output).toContain("search result");
  });

  it("handles multi-turn tool loop", async () => {
    const calcTool = makeTool("calc");
    const executor = createToolExecutor([calcTool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Calculate" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => {
          callCount++;
          if (callCount <= 2) {
            return {
              content: null,
              toolCalls: [{ id: `tc${callCount}`, name: "calc", arguments: { input: String(callCount) } }],
              usage: { promptTokens: 5, completionTokens: 5 },
            };
          }
          return {
            content: "Done calculating!",
            usage: { promptTokens: 10, completionTokens: 10 },
          };
        },
        calculateCost: mockCalculateCost(),
      })
    );

    const toolCalls = events.filter((e) => e.type === "tool-call");
    expect(toolCalls).toHaveLength(2);
    expect((toolCalls[0] as Extract<AgentLoopEvent, { type: "tool-call" }>).iteration).toBe(0);
    expect((toolCalls[1] as Extract<AgentLoopEvent, { type: "tool-call" }>).iteration).toBe(1);
  });

  it("stops at max iterations", async () => {
    const loopTool = makeTool("loop");
    const executor = createToolExecutor([loopTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        maxIterations: 2,
        stream: false,
        generateWithTools: async () => ({
          content: null,
          toolCalls: [{ id: "tc", name: "loop", arguments: {} }],
          usage: { promptTokens: 5, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const errorEvent = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.message).toContain("Max iterations");
  });

  it("max iterations capped at 25", async () => {
    const tool = makeTool("t");
    const executor = createToolExecutor([tool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        maxIterations: 100, // Try to go beyond cap
        stream: false,
        generateWithTools: async () => {
          callCount++;
          return {
            content: null,
            toolCalls: [{ id: `tc${callCount}`, name: "t", arguments: {} }],
            usage: { promptTokens: 1, completionTokens: 1 },
          };
        },
        calculateCost: mockCalculateCost(),
      })
    );

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    // Should be capped at 25
    const toolCalls = events.filter((e) => e.type === "tool-call");
    expect(toolCalls.length).toBeLessThanOrEqual(25);
  });

  it("handles tool execution errors gracefully", async () => {
    const failTool = makeTool("fail", async () => {
      throw new Error("Tool crashed!");
    });
    const executor = createToolExecutor([failTool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Call fail tool" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              content: null,
              toolCalls: [{ id: "tc1", name: "fail", arguments: {} }],
              usage: { promptTokens: 5, completionTokens: 5 },
            };
          }
          return {
            content: "Recovered from error",
            usage: { promptTokens: 10, completionTokens: 10 },
          };
        },
        calculateCost: mockCalculateCost(),
      })
    );

    const toolResult = events.find((e) => e.type === "tool-result") as Extract<AgentLoopEvent, { type: "tool-result" }>;
    expect(toolResult.output).toBe("Error: Tool execution failed");

    // Should still get a final text response (error goes back to LLM)
    const textEvent = events.find((e) => e.type === "text");
    expect(textEvent).toBeDefined();
  });

  it("stream: true falls through to batch when streamWithTools absent", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Hi" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s-stream-fallback",
        model: "test-model",
        stream: true, // no streamWithTools provided → batch path
        generateWithTools: async () => ({
          content: "Batch fallback response",
          usage: { promptTokens: 5, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const textEvent = events.find((e) => e.type === "text") as Extract<AgentLoopEvent, { type: "text" }>;
    expect(textEvent).toBeDefined();
    expect(textEvent.content).toBe("Batch fallback response");
    expect(events.some((e) => e.type === "done")).toBe(true);
  });

  it("accumulates costs across iterations", async () => {
    const tool = makeTool("t");
    const executor = createToolExecutor([tool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              content: null,
              toolCalls: [{ id: "tc1", name: "t", arguments: {} }],
              usage: { promptTokens: 10, completionTokens: 10 },
            };
          }
          return {
            content: "Done",
            usage: { promptTokens: 20, completionTokens: 20 },
          };
        },
        calculateCost: (_m, p, c) => ({ costUSD: (p + c) * 0.001 }),
      })
    );

    const usageEvents = events.filter((e) => e.type === "usage") as Array<Extract<AgentLoopEvent, { type: "usage" }>>;
    expect(usageEvents).toHaveLength(2);
    const totalCost = usageEvents.reduce((sum, e) => sum + e.cost, 0);
    expect(totalCost).toBeGreaterThan(0);
  });
});

describe("runAgentLoop — stopWhen safety", () => {
  it("yields error event (not raw throw) when stopWhen throws in batch path", async () => {
    const tool = makeTool("t");
    const executor = createToolExecutor([tool]);
    let callCount = 0;

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "sw-throw-batch",
        model: "test-model",
        stream: false,
        generateWithTools: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              content: null,
              toolCalls: [{ id: "tc1", name: "t", arguments: {} }],
              usage: { promptTokens: 5, completionTokens: 5 },
            };
          }
          return { content: "done", usage: { promptTokens: 5, completionTokens: 5 } };
        },
        calculateCost: mockCalculateCost(),
        stopWhen: () => { throw new Error("stopWhen exploded"); },
      })
    );

    const errorEvent = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.message).toContain("stopWhen exploded");
    // Generator must terminate cleanly — no hanging
    expect(events.at(-1)?.type).toBe("error");
  });

  it("yields error event (not raw throw) when stopWhen throws in streaming path", async () => {
    const tool = makeTool("t");
    const executor = createToolExecutor([tool]);

    async function* fakeStream(): AsyncGenerator<LLMStreamEvent> {
      yield { type: "tool-call", id: "tc1", name: "t", arguments: {} };
      yield { type: "usage", promptTokens: 5, completionTokens: 5 };
    }

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "sw-throw-stream",
        model: "test-model",
        stream: true,
        streamWithTools: fakeStream,
        generateWithTools: async () => ({ content: "unreachable", usage: { promptTokens: 0, completionTokens: 0 } }),
        calculateCost: mockCalculateCost(),
        stopWhen: () => { throw new Error("stream stopWhen exploded"); },
      })
    );

    const errorEvent = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.message).toContain("stream stopWhen exploded");
  });
});

describe("runAgentLoop — message history cap", () => {
  it("does not pass more than MAX_HISTORY_MESSAGES messages to the LLM", async () => {
    const tool = makeTool("t");
    const executor = createToolExecutor([tool]);
    let callCount = 0;
    const messageLengthsSeenByLLM: number[] = [];

    // Run 10 iterations each adding a tool-call + tool-result pair (2 messages per iter)
    // plus the original user message = 1 + 10*2 = 21 messages total accumulated.
    // With MAX_HISTORY_MESSAGES=200 this won't trigger the cap in normal use,
    // but we verify the call with a synthetic very-large history by pre-seeding messages.
    // Easiest: pass 210 history messages into the loop and verify LLM never sees > 200.
    const largeHistory: import("@fabrk/ai").LLMMessage[] = Array.from({ length: 210 }, (_, i) => ({
      role: i % 2 === 0 ? "user" as const : "assistant" as const,
      content: `message ${i}`,
    }));

    await collectEvents(
      runAgentLoop({
        messages: largeHistory,
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "history-cap",
        model: "test-model",
        stream: false,
        generateWithTools: async (msgs) => {
          callCount++;
          messageLengthsSeenByLLM.push(msgs.length);
          return { content: "done", usage: { promptTokens: 5, completionTokens: 5 } };
        },
        calculateCost: mockCalculateCost(),
      })
    );

    expect(callCount).toBeGreaterThan(0);
    for (const len of messageLengthsSeenByLLM) {
      expect(len).toBeLessThanOrEqual(200);
    }
  });
});

describe("runAgentLoop — streaming path (stream: true + streamWithTools)", () => {
  it("yields text-delta events and done on text-only stream", async () => {
    const executor = createToolExecutor([]);

    async function* fakeStream(): AsyncGenerator<LLMStreamEvent> {
      yield { type: "text-delta", content: "Hello " };
      yield { type: "text-delta", content: "world" };
      yield { type: "usage", promptTokens: 10, completionTokens: 5 };
    }

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Hi" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "stream-s1",
        model: "test-model",
        stream: true,
        streamWithTools: fakeStream,
        generateWithTools: async () => ({ content: "unreachable", usage: { promptTokens: 0, completionTokens: 0 } }),
        calculateCost: mockCalculateCost(),
      })
    );

    const textDeltas = events.filter((e) => e.type === "text-delta") as Extract<AgentLoopEvent, { type: "text-delta" }>[];
    expect(textDeltas).toHaveLength(2);
    expect(textDeltas[0].content).toBe("Hello ");
    expect(textDeltas[1].content).toBe("world");
    expect(events.some((e) => e.type === "usage")).toBe(true);
    expect(events.some((e) => e.type === "text")).toBe(true);
    expect(events.some((e) => e.type === "done")).toBe(true);
  });

  it("accumulates tool-call events then executes tools and loops", async () => {
    const pingTool = makeTool("ping");
    const executor = createToolExecutor([pingTool]);
    let streamCallCount = 0;

    async function* fakeStream(): AsyncGenerator<LLMStreamEvent> {
      streamCallCount++;
      if (streamCallCount === 1) {
        yield { type: "tool-call", id: "tc1", name: "ping", arguments: { input: "test" } };
        yield { type: "usage", promptTokens: 10, completionTokens: 5 };
      } else {
        yield { type: "text-delta", content: "Done!" };
        yield { type: "usage", promptTokens: 5, completionTokens: 3 };
      }
    }

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Ping" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test",
        sessionId: "stream-s2",
        model: "test-model",
        stream: true,
        streamWithTools: fakeStream,
        generateWithTools: async () => ({ content: "unreachable", usage: { promptTokens: 0, completionTokens: 0 } }),
        calculateCost: mockCalculateCost(),
      })
    );

    expect(events.some((e) => e.type === "tool-call")).toBe(true);
    expect(events.some((e) => e.type === "tool-result")).toBe(true);
    expect(events.some((e) => e.type === "text-delta")).toBe(true);
    expect(events.some((e) => e.type === "done")).toBe(true);
    expect(streamCallCount).toBe(2); // once for tools, once for final text
  });
});
