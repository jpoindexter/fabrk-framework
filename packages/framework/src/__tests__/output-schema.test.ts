import { describe, it, expect } from "vitest";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";

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

describe("outputSchema on AgentLoopOptions", () => {
  it("emits structured-output event when LLM response is valid JSON and outputSchema is set", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Give me data" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object", properties: { name: { type: "string" } } },
        generateWithTools: async () => ({
          content: '{"name":"Alice","score":42}',
          usage: { promptTokens: 10, completionTokens: 10 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output") as
      | Extract<AgentLoopEvent, { type: "structured-output" }>
      | undefined;
    expect(structuredEvent).toBeDefined();
  });

  it("structured-output data matches the parsed JSON object", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Give me data" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s2",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object" },
        generateWithTools: async () => ({
          content: '{"name":"Alice","score":42}',
          usage: { promptTokens: 10, completionTokens: 10 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output") as
      Extract<AgentLoopEvent, { type: "structured-output" }>;
    expect(structuredEvent.data).toEqual({ name: "Alice", score: 42 });
  });

  it("never emits structured-output when outputSchema is absent", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Give me data" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s3",
        model: "test-model",
        stream: false,
        // no outputSchema
        generateWithTools: async () => ({
          content: '{"name":"Alice"}',
          usage: { promptTokens: 10, completionTokens: 10 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output");
    expect(structuredEvent).toBeUndefined();
  });

  it("non-JSON response with outputSchema emits no structured-output but still emits text", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Tell me something" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s4",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object" },
        generateWithTools: async () => ({
          content: "This is not JSON at all.",
          usage: { promptTokens: 10, completionTokens: 10 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output");
    expect(structuredEvent).toBeUndefined();

    const textEvent = events.find((e) => e.type === "text") as
      Extract<AgentLoopEvent, { type: "text" }>;
    expect(textEvent).toBeDefined();
    expect(textEvent.content).toBe("This is not JSON at all.");
  });

  it("done event includes structuredOutput when schema provided and response is valid JSON", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Give me data" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s5",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object" },
        generateWithTools: async () => ({
          content: '{"result":true}',
          usage: { promptTokens: 5, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const doneEvent = events.find((e) => e.type === "done") as
      Extract<AgentLoopEvent, { type: "done" }>;
    expect(doneEvent).toBeDefined();
    expect(doneEvent.structuredOutput).toEqual({ result: true });
  });

  it("done event structuredOutput is undefined when response is not JSON", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Hello" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s6",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object" },
        generateWithTools: async () => ({
          content: "plain text response",
          usage: { promptTokens: 5, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const doneEvent = events.find((e) => e.type === "done") as
      Extract<AgentLoopEvent, { type: "done" }>;
    expect(doneEvent).toBeDefined();
    expect(doneEvent.structuredOutput).toBeUndefined();
  });

  it("structured-output event iteration matches the current iteration number", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Go" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s7",
        model: "test-model",
        stream: false,
        outputSchema: { type: "object" },
        generateWithTools: async () => ({
          content: '{"ok":1}',
          usage: { promptTokens: 5, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output") as
      Extract<AgentLoopEvent, { type: "structured-output" }>;
    expect(structuredEvent).toBeDefined();
    // First iteration is 0
    expect(structuredEvent.iteration).toBe(0);
  });

  it("emits structured-output via streaming path when outputSchema is set", async () => {
    const executor = createToolExecutor([]);

    async function* fakeStream() {
      yield { type: "text-delta" as const, content: '{"streamed":true}' };
      yield { type: "usage" as const, promptTokens: 5, completionTokens: 5 };
    }

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Stream data" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s8",
        model: "test-model",
        stream: true,
        outputSchema: { type: "object" },
        streamWithTools: fakeStream,
        generateWithTools: async () => ({ content: "", usage: { promptTokens: 0, completionTokens: 0 } }),
        calculateCost: mockCalculateCost(),
      })
    );

    const structuredEvent = events.find((e) => e.type === "structured-output") as
      Extract<AgentLoopEvent, { type: "structured-output" }>;
    expect(structuredEvent).toBeDefined();
    expect(structuredEvent.data).toEqual({ streamed: true });
  });
});
