import { describe, it, expect } from "vitest";
import { mockLLM, MockLLM } from "../testing/mock-llm";
import { createTestAgent } from "../testing/create-test-agent";
import { calledTool, calledToolWith, respondedWith, costUnder, getToolCalls } from "../testing/assert-agent";
import { defineTool, textResult } from "../tools/define-tool";

// ---------------------------------------------------------------------------
// MockLLM builder
// ---------------------------------------------------------------------------

describe("MockLLM", () => {
  it("creates a new instance via mockLLM()", () => {
    const mock = mockLLM();
    expect(mock).toBeInstanceOf(MockLLM);
  });

  it("responds with default response for unmatched messages", async () => {
    const mock = mockLLM();
    const gen = mock.asGenerateWithTools();
    const result = await gen([{ role: "user", content: "hello" }], []);
    expect(result.content).toBe("Mock response");
  });

  it("matches string patterns in user messages", async () => {
    const mock = mockLLM()
      .onMessage("search for").respondWith("Found 3 results");

    const gen = mock.asGenerateWithTools();
    const result = await gen(
      [{ role: "user", content: "please search for cats" }],
      [],
    );
    expect(result.content).toBe("Found 3 results");
  });

  it("matches regex patterns", async () => {
    const mock = mockLLM()
      .onMessage(/\d+ items/).respondWith("Counted items");

    const gen = mock.asGenerateWithTools();
    const result = await gen(
      [{ role: "user", content: "I have 5 items" }],
      [],
    );
    expect(result.content).toBe("Counted items");
  });

  it("generates tool calls via onMessage().callTool()", async () => {
    const mock = mockLLM()
      .onMessage("search").callTool("web-search", { query: "cats" });

    const gen = mock.asGenerateWithTools();
    const result = await gen(
      [{ role: "user", content: "search the web" }],
      [],
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].name).toBe("web-search");
    expect(result.toolCalls![0].arguments).toEqual({ query: "cats" });
  });

  it("tracks call count and call log", async () => {
    const mock = mockLLM();
    const gen = mock.asGenerateWithTools();

    await gen([{ role: "user", content: "first" }], []);
    await gen([{ role: "user", content: "second" }], []);

    expect(mock.callCount).toBe(2);
    expect(mock.getCalls()).toHaveLength(2);
    expect(mock.getCalls()[0].messages[0].content).toBe("first");
  });

  it("resets call log", async () => {
    const mock = mockLLM();
    const gen = mock.asGenerateWithTools();
    await gen([{ role: "user", content: "test" }], []);

    mock.reset();
    expect(mock.callCount).toBe(0);
  });

  it("setDefault overrides the fallback response", async () => {
    const mock = mockLLM().setDefault("custom default");
    const gen = mock.asGenerateWithTools();
    const result = await gen([{ role: "user", content: "anything" }], []);
    expect(result.content).toBe("custom default");
  });

  it("zeroCost returns 0 for any model", () => {
    const calc = MockLLM.zeroCost();
    expect(calc("gpt-4o", 1000, 500).costUSD).toBe(0);
  });

  it("streaming emits text-delta for text responses", async () => {
    const mock = mockLLM().setDefault("streamed text");
    const gen = mock.asStreamWithTools();
    const events: unknown[] = [];

    for await (const event of gen([{ role: "user", content: "hi" }], [])) {
      events.push(event);
    }

    expect(events).toContainEqual({ type: "text-delta", content: "streamed text" });
    expect(events).toContainEqual(expect.objectContaining({ type: "usage" }));
  });

  it("streaming emits tool-call events", async () => {
    const mock = mockLLM()
      .onMessage("search").callTool("web-search", { q: "test" });
    const gen = mock.asStreamWithTools();
    const events: unknown[] = [];

    for await (const event of gen([{ role: "user", content: "search" }], [])) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool-call", name: "web-search" })
    );
  });
});

// ---------------------------------------------------------------------------
// createTestAgent — integration with agent loop
// ---------------------------------------------------------------------------

describe("createTestAgent", () => {
  const searchTool = defineTool({
    name: "search",
    description: "Search for information",
    schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    handler: async (input) =>
      textResult(`Results for: ${input.query}`),
  });

  it("sends a message and gets a response", async () => {
    const mock = mockLLM().setDefault("Hello back!");
    const agent = createTestAgent({ mock });
    const result = await agent.send("Hello");

    expect(result.content).toBe("Hello back!");
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("collects tool call events", async () => {
    const mock = mockLLM()
      .onMessage("search").callTool("search", { query: "cats" })
      .setDefault("Found cats!");

    const agent = createTestAgent({ mock, tools: [searchTool] });
    const result = await agent.send("search for cats");

    expect(result.toolCalls).toContainEqual(
      expect.objectContaining({ name: "search", input: { query: "cats" } })
    );
  });

  it("executes tools and includes tool results in agent loop", async () => {
    const mock = mockLLM()
      .onMessage("search").callTool("search", { query: "dogs" })
      .setDefault("Here are the results about dogs");

    // maxIterations=1 means: one tool-call round, then the loop re-invokes
    // the LLM without tools to get a final text response
    const agent = createTestAgent({ mock, tools: [searchTool], maxIterations: 1 });
    const result = await agent.send("search for dogs");

    // At least 1 LLM call made the tool call
    expect(mock.callCount).toBeGreaterThanOrEqual(1);
    expect(result.toolCalls).toContainEqual(
      expect.objectContaining({ name: "search" }),
    );
  });

  it("passes system prompt to the agent loop", async () => {
    const mock = mockLLM().setDefault("OK");
    const agent = createTestAgent({ mock, systemPrompt: "You are a helpful assistant" });
    await agent.send("Hi");

    const messages = mock.getCalls()[0].messages;
    expect(messages[0]).toEqual({ role: "system", content: "You are a helpful assistant" });
  });

  it("tracks usage across iterations", async () => {
    const mock = mockLLM()
      .onMessage("search").callTool("search", { query: "test" })
      .setDefault("Done");

    const agent = createTestAgent({ mock, tools: [searchTool] });
    const result = await agent.send("search something");

    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

describe("assertion helpers", () => {
  const makeResult = (overrides?: Partial<import("../testing/create-test-agent").TestAgentResult>) => ({
    content: "Found 3 cats",
    toolCalls: [
      { name: "search", input: { query: "cats" } },
      { name: "format", input: { style: "table" } },
    ],
    usage: { promptTokens: 100, completionTokens: 50, cost: 0.002 },
    events: [
      { type: "tool-call", name: "search" },
      { type: "tool-call", name: "format" },
      { type: "done" },
    ],
    ...overrides,
  });

  it("calledTool returns true when tool was called", () => {
    expect(calledTool(makeResult(), "search")).toBe(true);
  });

  it("calledTool returns false when tool was not called", () => {
    expect(calledTool(makeResult(), "delete")).toBe(false);
  });

  it("calledToolWith matches tool name and input", () => {
    expect(calledToolWith(makeResult(), "search", { query: "cats" })).toBe(true);
  });

  it("calledToolWith returns false on wrong input", () => {
    expect(calledToolWith(makeResult(), "search", { query: "dogs" })).toBe(false);
  });

  it("respondedWith matches substring", () => {
    expect(respondedWith(makeResult(), "3 cats")).toBe(true);
  });

  it("respondedWith matches regex", () => {
    expect(respondedWith(makeResult(), /\d+ cats/)).toBe(true);
  });

  it("costUnder checks threshold", () => {
    expect(costUnder(makeResult(), 0.01)).toBe(true);
    expect(costUnder(makeResult(), 0.001)).toBe(false);
  });

  it("getToolCalls filters by name", () => {
    const calls = getToolCalls(makeResult(), "search");
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toEqual({ query: "cats" });
  });
});
