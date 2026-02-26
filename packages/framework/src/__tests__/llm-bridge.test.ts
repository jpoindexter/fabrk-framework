import { describe, it, expect } from "vitest";
import { createLLMBridge } from "../agents/llm-bridge";

describe("createLLMBridge", () => {
  it("creates a bridge with model and provider", () => {
    const bridge = createLLMBridge({ model: "gpt-4o" });
    expect(bridge.model).toBe("gpt-4o");
    expect(bridge.provider).toBe("openai");
  });

  it("detects anthropic provider from model name", () => {
    const bridge = createLLMBridge({ model: "claude-sonnet-4-5-20250514" });
    expect(bridge.provider).toBe("anthropic");
  });

  it("detects ollama provider from prefix", () => {
    const bridge = createLLMBridge({ model: "ollama:llama3" });
    expect(bridge.provider).toBe("ollama");
  });

  it("detects google provider from gemini model", () => {
    const bridge = createLLMBridge({ model: "gemini-pro" });
    expect(bridge.provider).toBe("google");
  });

  it("strips prefix from ollama model name", () => {
    const bridge = createLLMBridge({ model: "ollama:llama3" });
    expect(bridge.resolvedModel).toBe("llama3");
  });
});
