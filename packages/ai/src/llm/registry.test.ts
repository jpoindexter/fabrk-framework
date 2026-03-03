import { describe, it, expect, beforeEach, vi } from "vitest";

describe("provider registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists built-in providers", async () => {
    const { listProviders } = await import("./registry");
    const providers = listProviders();
    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
    expect(providers).toContain("ollama");
  });

  it("gets provider by key", async () => {
    const { getProviderByKey } = await import("./registry");
    const openai = getProviderByKey("openai");
    expect(openai).toBeDefined();
    expect(openai!.key).toBe("openai");
    expect(openai!.envKey).toBe("OPENAI_API_KEY");
  });

  it("returns undefined for unknown key", async () => {
    const { getProviderByKey } = await import("./registry");
    expect(getProviderByKey("nonexistent")).toBeUndefined();
  });

  it("matches openai models by prefix", async () => {
    const { getProvider } = await import("./registry");
    expect(getProvider("gpt-4o")?.key).toBe("openai");
    expect(getProvider("o3-mini")?.key).toBe("openai");
    expect(getProvider("chatgpt-4o-latest")?.key).toBe("openai");
  });

  it("matches anthropic models by prefix", async () => {
    const { getProvider } = await import("./registry");
    expect(getProvider("claude-sonnet-4-5-20250514")?.key).toBe("anthropic");
  });

  it("matches google models by prefix", async () => {
    const { getProvider } = await import("./registry");
    expect(getProvider("gemini-pro")?.key).toBe("google");
  });

  it("matches ollama models by prefix", async () => {
    const { getProvider } = await import("./registry");
    expect(getProvider("ollama:llama3")?.key).toBe("ollama");
  });

  it("returns undefined for unknown model", async () => {
    const { getProvider } = await import("./registry");
    expect(getProvider("unknown-model-xyz")).toBeUndefined();
  });

  it("registers a custom provider", async () => {
    const { registerProvider, getProviderByKey, listProviders } = await import("./registry");

    registerProvider("custom", {
      key: "custom",
      prefixes: ["custom:"],
      envKey: "CUSTOM_API_KEY",
      makeGenerateWithTools: () => async () => ({
        content: "test",
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
      makeStreamWithTools: () => async function* () {
        yield { type: "text-delta" as const, content: "test" };
      },
    });

    expect(listProviders()).toContain("custom");
    expect(getProviderByKey("custom")?.key).toBe("custom");
  });

  it("longest prefix wins for ambiguous models", async () => {
    const { registerProvider, getProvider } = await import("./registry");

    registerProvider("specific", {
      key: "specific",
      prefixes: ["llama-3.1-sonar"],
      envKey: "SPECIFIC_KEY",
      makeGenerateWithTools: () => async () => ({
        content: null,
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
      makeStreamWithTools: () => async function* () {
        // empty
      },
    });

    registerProvider("generic", {
      key: "generic",
      prefixes: ["llama-"],
      envKey: "GENERIC_KEY",
      makeGenerateWithTools: () => async () => ({
        content: null,
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
      makeStreamWithTools: () => async function* () {
        // empty
      },
    });

    // "llama-3.1-sonar-large" should match the longer "llama-3.1-sonar" prefix
    const match = getProvider("llama-3.1-sonar-large");
    expect(match?.key).toBe("specific");

    // "llama-3-70b" should match the shorter "llama-" prefix
    const match2 = getProvider("llama-3-70b");
    expect(match2?.key).toBe("generic");
  });

  it("provider adapter creates generate function", async () => {
    const { getProviderByKey } = await import("./registry");
    const openai = getProviderByKey("openai");
    expect(openai).toBeDefined();
    const fn = openai!.makeGenerateWithTools({});
    expect(typeof fn).toBe("function");
  });

  it("provider adapter creates stream function", async () => {
    const { getProviderByKey } = await import("./registry");
    const anthropic = getProviderByKey("anthropic");
    expect(anthropic).toBeDefined();
    const fn = anthropic!.makeStreamWithTools({});
    expect(typeof fn).toBe("function");
  });
});
