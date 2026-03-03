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

  it("detects bedrock provider and strips prefix", () => {
    const bridge = createLLMBridge({ model: "bedrock:anthropic.claude-3-5-sonnet" });
    expect(bridge.provider).toBe("bedrock");
    expect(bridge.resolvedModel).toBe("anthropic.claude-3-5-sonnet");
  });

  it("detects azure provider and strips prefix", () => {
    const bridge = createLLMBridge({ model: "azure:my-deployment" });
    expect(bridge.provider).toBe("azure");
    expect(bridge.resolvedModel).toBe("my-deployment");
  });

  it("detects together provider and strips prefix", () => {
    const bridge = createLLMBridge({ model: "together:meta-llama/Llama-3-70b" });
    expect(bridge.provider).toBe("together");
    expect(bridge.resolvedModel).toBe("meta-llama/Llama-3-70b");
  });

  it("detects groq provider and strips prefix", () => {
    const bridge = createLLMBridge({ model: "groq:llama-3.3-70b-versatile" });
    expect(bridge.provider).toBe("groq");
    expect(bridge.resolvedModel).toBe("llama-3.3-70b-versatile");
  });

  it("detects deepseek provider", () => {
    const bridge = createLLMBridge({ model: "deepseek-chat" });
    expect(bridge.provider).toBe("deepseek");
    expect(bridge.resolvedModel).toBe("deepseek-chat");
  });

  it("detects mistral provider", () => {
    const bridge = createLLMBridge({ model: "mistral-large-latest" });
    expect(bridge.provider).toBe("mistral");
  });

  it("detects codestral as mistral provider", () => {
    const bridge = createLLMBridge({ model: "codestral-latest" });
    expect(bridge.provider).toBe("mistral");
  });

  it("detects cohere provider", () => {
    const bridge = createLLMBridge({ model: "command-r-plus" });
    expect(bridge.provider).toBe("cohere");
  });

  it("detects xai provider", () => {
    const bridge = createLLMBridge({ model: "grok-3" });
    expect(bridge.provider).toBe("xai");
  });

  it("detects perplexity from pplx- prefix", () => {
    const bridge = createLLMBridge({ model: "pplx-70b-online" });
    expect(bridge.provider).toBe("perplexity");
  });

  it("detects perplexity from sonar model name", () => {
    const bridge = createLLMBridge({ model: "llama-3.1-sonar-large-128k-online" });
    expect(bridge.provider).toBe("perplexity");
  });

  it("detects fireworks provider", () => {
    const bridge = createLLMBridge({ model: "accounts/fireworks/models/llama-v3-70b" });
    expect(bridge.provider).toBe("fireworks");
  });
});
