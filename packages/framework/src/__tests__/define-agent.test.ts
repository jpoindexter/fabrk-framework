import { describe, it, expect } from "vitest";
import { defineAgent } from "../agents/define-agent";

describe("defineAgent", () => {
  it("returns a valid agent definition", () => {
    const agent = defineAgent({
      model: "claude-sonnet-4-5-20250514",
      tools: ["search-docs"],
      budget: { daily: 10, perSession: 0.5 },
      stream: true,
      auth: "required",
    });

    expect(agent.model).toBe("claude-sonnet-4-5-20250514");
    expect(agent.tools).toEqual(["search-docs"]);
    expect(agent.budget?.daily).toBe(10);
    expect(agent.stream).toBe(true);
    expect(agent.auth).toBe("required");
  });

  it("applies defaults", () => {
    const agent = defineAgent({
      model: "gpt-4o",
    });

    expect(agent.stream).toBe(true);
    expect(agent.auth).toBe("none");
    expect(agent.tools).toEqual([]);
  });

  it("accepts systemPrompt as string or file path", () => {
    const agent = defineAgent({
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "./prompts/system.md",
    });

    expect(agent.systemPrompt).toBe("./prompts/system.md");
  });

  it("accepts fallback providers", () => {
    const agent = defineAgent({
      model: "claude-sonnet-4-5-20250514",
      fallback: ["gpt-4o", "ollama:llama3"],
    });

    expect(agent.fallback).toEqual(["gpt-4o", "ollama:llama3"]);
  });
});
