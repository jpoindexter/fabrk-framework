import { describe, it, expect } from "vitest";
import {
  calledTool,
  calledToolWith,
  respondedWith,
  costUnder,
  iterationsUnder,
  getToolCalls,
} from "../testing/assert-agent";
import type { TestAgentResult } from "../testing/create-test-agent";

function makeResult(overrides: Partial<TestAgentResult> = {}): TestAgentResult {
  return {
    content: "Test response",
    toolCalls: [],
    usage: { promptTokens: 10, completionTokens: 5, cost: 0.001 },
    events: [],
    ...overrides,
  };
}

describe("calledTool", () => {
  it("returns true when tool was called", () => {
    const result = makeResult({
      toolCalls: [{ name: "search", input: { q: "cats" } }],
    });
    expect(calledTool(result, "search")).toBe(true);
  });

  it("returns false when tool was not called", () => {
    const result = makeResult({ toolCalls: [] });
    expect(calledTool(result, "search")).toBe(false);
  });
});

describe("calledToolWith", () => {
  it("returns true when tool called with matching input", () => {
    const result = makeResult({
      toolCalls: [{ name: "search", input: { q: "cats", limit: 10 } }],
    });
    expect(calledToolWith(result, "search", { q: "cats" })).toBe(true);
  });

  it("returns false when input does not match", () => {
    const result = makeResult({
      toolCalls: [{ name: "search", input: { q: "dogs" } }],
    });
    expect(calledToolWith(result, "search", { q: "cats" })).toBe(false);
  });
});

describe("respondedWith", () => {
  it("returns true for substring match", () => {
    const result = makeResult({ content: "The answer is 42" });
    expect(respondedWith(result, "answer is 42")).toBe(true);
  });

  it("returns false when string absent", () => {
    const result = makeResult({ content: "Hello world" });
    expect(respondedWith(result, "answer")).toBe(false);
  });

  it("returns true for regex match", () => {
    const result = makeResult({ content: "Error: code 503" });
    expect(respondedWith(result, /code \d+/)).toBe(true);
  });
});

describe("costUnder", () => {
  it("returns true when cost is below threshold", () => {
    const result = makeResult({ usage: { promptTokens: 10, completionTokens: 5, cost: 0.001 } });
    expect(costUnder(result, 0.01)).toBe(true);
  });

  it("returns false when cost exceeds threshold", () => {
    const result = makeResult({ usage: { promptTokens: 10, completionTokens: 5, cost: 0.05 } });
    expect(costUnder(result, 0.01)).toBe(false);
  });

  it("returns true when cost exactly equals threshold", () => {
    const result = makeResult({ usage: { promptTokens: 10, completionTokens: 5, cost: 0.01 } });
    expect(costUnder(result, 0.01)).toBe(true);
  });
});

describe("iterationsUnder", () => {
  it("returns true when tool-call count is below threshold", () => {
    const result = makeResult({
      events: [
        { type: "tool-call", name: "search" },
        { type: "tool-result", name: "search" },
        { type: "text", content: "done" },
      ],
    });
    expect(iterationsUnder(result, 2)).toBe(true);
  });

  it("returns false when tool-call count exceeds threshold", () => {
    const result = makeResult({
      events: [
        { type: "tool-call", name: "a" },
        { type: "tool-call", name: "b" },
        { type: "tool-call", name: "c" },
      ],
    });
    expect(iterationsUnder(result, 2)).toBe(false);
  });

  it("returns true when no tool calls were made", () => {
    const result = makeResult({ events: [{ type: "text", content: "hi" }] });
    expect(iterationsUnder(result, 0)).toBe(true);
  });
});

describe("getToolCalls", () => {
  it("returns only calls matching the given tool name", () => {
    const result = makeResult({
      toolCalls: [
        { name: "search", input: { q: "cats" } },
        { name: "calc", input: { expr: "1+1" } },
        { name: "search", input: { q: "dogs" } },
      ],
    });
    const calls = getToolCalls(result, "search");
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.name === "search")).toBe(true);
  });

  it("returns empty array when tool was not called", () => {
    const result = makeResult({
      toolCalls: [{ name: "calc", input: { expr: "2+2" } }],
    });
    expect(getToolCalls(result, "search")).toEqual([]);
  });
});
