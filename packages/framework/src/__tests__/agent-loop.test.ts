import { describe, it, expect } from "vitest";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";

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
