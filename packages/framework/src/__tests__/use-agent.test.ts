import { describe, it, expect } from "vitest";
import { parseSSELine } from "../client/use-agent.js";

describe("parseSSELine", () => {
  it("parses a text event", () => {
    const result = parseSSELine('data: {"type":"text","content":"Hello"}');
    expect(result).toEqual({ type: "text", content: "Hello" });
  });

  it("parses a usage event", () => {
    const result = parseSSELine(
      'data: {"type":"usage","promptTokens":10,"completionTokens":5,"cost":0.001}'
    );
    expect(result).toEqual({
      type: "usage",
      promptTokens: 10,
      completionTokens: 5,
      cost: 0.001,
    });
  });

  it("parses a done event", () => {
    const result = parseSSELine('data: {"type":"done"}');
    expect(result).toEqual({ type: "done" });
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine(": comment")).toBeNull();
    expect(parseSSELine("event: message")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const result = parseSSELine("data: not-json");
    expect(result).toBeNull();
  });
});
