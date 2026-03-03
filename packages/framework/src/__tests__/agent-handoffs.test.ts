import { describe, it, expect } from "vitest";
import { defineAgent } from "../agents/define-agent";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";

function makeTool(name: string): ToolDefinition {
  return {
    name,
    description: `Tool: ${name}`,
    schema: { type: "object", properties: { input: { type: "string" } } },
    handler: async () => ({
      content: [{ type: "text", text: `${name} result` }],
    }),
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

function makeGenerateWithTools(toolCallName: string) {
  let callCount = 0;
  return async () => {
    callCount++;
    if (callCount === 1) {
      return {
        content: "",
        toolCalls: [{ id: "tc1", name: toolCallName, arguments: { input: "test" } }],
        usage: { promptTokens: 10, completionTokens: 5 },
      };
    }
    return {
      content: "Done",
      usage: { promptTokens: 5, completionTokens: 3 },
    };
  };
}

describe("defineAgent handoffs", () => {
  it("accepts handoffs array and stores it in the definition", () => {
    const agent = defineAgent({
      model: "gpt-4o",
      handoffs: ["search-agent", "summarize-agent"],
    });
    expect(agent.handoffs).toEqual(["search-agent", "summarize-agent"]);
  });

  it("without handoffs option, handoffs is undefined (no regression)", () => {
    const agent = defineAgent({ model: "gpt-4o" });
    expect(agent.handoffs).toBeUndefined();
  });

  it("empty handoffs array is preserved", () => {
    const agent = defineAgent({ model: "gpt-4o", handoffs: [] });
    expect(agent.handoffs).toEqual([]);
  });
});

describe("AgentLoopEvent type includes handoff", () => {
  it("can assign a handoff event to AgentLoopEvent type (compile-time assertion)", () => {
    const event: AgentLoopEvent = { type: "handoff", targetAgent: "search-agent", input: "hello", iteration: 0 };
    expect(event.type).toBe("handoff");
  });
});

describe("runAgentLoop handoffs", () => {
  it("emits handoff event when tool name is in handoffs", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search for something" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        handoffs: ["search"],
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const handoffEvents = events.filter((e) => e.type === "handoff");
    expect(handoffEvents).toHaveLength(1);
  });

  it("handoff event has correct targetAgent, input, and iteration fields", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search for something" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        handoffs: ["search"],
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const handoffEvent = events.find((e) => e.type === "handoff");
    expect(handoffEvent).toBeDefined();
    if (handoffEvent && handoffEvent.type === "handoff") {
      expect(handoffEvent.targetAgent).toBe("search");
      expect(typeof handoffEvent.input).toBe("string");
      expect(typeof handoffEvent.iteration).toBe("number");
    }
  });

  it("does NOT emit handoff event when handoffs option is not provided", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search for something" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        // no handoffs
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const handoffEvents = events.filter((e) => e.type === "handoff");
    expect(handoffEvents).toHaveLength(0);
  });

  it("does NOT emit handoff when tool call is not in handoffs list", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search for something" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        handoffs: ["summarize-agent", "translate-agent"], // search is NOT in this list
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const handoffEvents = events.filter((e) => e.type === "handoff");
    expect(handoffEvents).toHaveLength(0);
  });

  it("multiple handoffs in array — tool call matching any one triggers handoff", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        handoffs: ["summarize-agent", "search", "translate-agent"],
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const handoffEvents = events.filter((e) => e.type === "handoff");
    expect(handoffEvents).toHaveLength(1);
    if (handoffEvents[0]?.type === "handoff") {
      expect(handoffEvents[0].targetAgent).toBe("search");
    }
  });

  it("tool-result event is still emitted alongside handoff event", async () => {
    const searchTool = makeTool("search");
    const executor = createToolExecutor([searchTool]);

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Search" }],
        toolExecutor: executor,
        toolSchemas: executor.toLLMSchema(),
        agentName: "test-agent",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        handoffs: ["search"],
        generateWithTools: makeGenerateWithTools("search"),
        calculateCost: mockCalculateCost(),
      })
    );

    const toolResultEvents = events.filter((e) => e.type === "tool-result");
    const handoffEvents = events.filter((e) => e.type === "handoff");
    expect(toolResultEvents.length).toBeGreaterThanOrEqual(1);
    expect(handoffEvents.length).toBeGreaterThanOrEqual(1);
  });
});
