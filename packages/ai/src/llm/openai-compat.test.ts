import { describe, it, expect, beforeEach, vi } from "vitest";

describe("openai-compat", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("makeOpenAICompatAdapter creates a valid ProviderAdapter", async () => {
    const { makeOpenAICompatAdapter } = await import("./openai-compat");
    const adapter = makeOpenAICompatAdapter({
      key: "test-provider",
      baseURL: "https://api.test.com/v1",
      envKey: "TEST_API_KEY",
      prefixes: ["test:"],
      stripPrefix: "test:",
    });

    expect(adapter.key).toBe("test-provider");
    expect(adapter.prefixes).toEqual(["test:"]);
    expect(adapter.envKey).toBe("TEST_API_KEY");
    expect(typeof adapter.makeGenerateWithTools).toBe("function");
    expect(typeof adapter.makeStreamWithTools).toBe("function");
  });

  it("registered compat providers are accessible via registry", async () => {
    // Import openai-compat to trigger side-effect registrations
    await import("./openai-compat");
    const { getProviderByKey, listProviders } = await import("./registry");

    const providers = listProviders();
    expect(providers).toContain("groq");
    expect(providers).toContain("together");
    expect(providers).toContain("fireworks");
    expect(providers).toContain("deepseek");
    expect(providers).toContain("xai");
    expect(providers).toContain("perplexity");
    expect(providers).toContain("mistral");
    expect(providers).toContain("azure");

    // Verify each has correct env key
    expect(getProviderByKey("groq")?.envKey).toBe("GROQ_API_KEY");
    expect(getProviderByKey("together")?.envKey).toBe("TOGETHER_API_KEY");
    expect(getProviderByKey("fireworks")?.envKey).toBe("FIREWORKS_API_KEY");
    expect(getProviderByKey("deepseek")?.envKey).toBe("DEEPSEEK_API_KEY");
    expect(getProviderByKey("xai")?.envKey).toBe("XAI_API_KEY");
    expect(getProviderByKey("perplexity")?.envKey).toBe("PPLX_API_KEY");
    expect(getProviderByKey("mistral")?.envKey).toBe("MISTRAL_API_KEY");
    expect(getProviderByKey("azure")?.envKey).toBe("AZURE_OPENAI_API_KEY");
  });

  it("prefix routing works for compat providers", async () => {
    await import("./openai-compat");
    const { getProvider } = await import("./registry");

    expect(getProvider("deepseek-chat")?.key).toBe("deepseek");
    expect(getProvider("grok-3")?.key).toBe("xai");
    expect(getProvider("mistral-large-latest")?.key).toBe("mistral");
    expect(getProvider("codestral-latest")?.key).toBe("mistral");
    expect(getProvider("pplx-70b-online")?.key).toBe("perplexity");
    expect(getProvider("accounts/fireworks/models/llama")?.key).toBe("fireworks");
  });

  it("groq: prefix routes to groq", async () => {
    await import("./openai-compat");
    const { getProvider } = await import("./registry");
    expect(getProvider("groq:llama-3.3-70b")?.key).toBe("groq");
  });

  it("together: prefix routes to together", async () => {
    await import("./openai-compat");
    const { getProvider } = await import("./registry");
    expect(getProvider("together:meta-llama/Llama-3-70b")?.key).toBe("together");
  });

  it("azure: prefix routes to azure", async () => {
    await import("./openai-compat");
    const { getProvider } = await import("./registry");
    expect(getProvider("azure:my-deployment")?.key).toBe("azure");
  });

  it("adapter makeGenerateWithTools returns a callable function", async () => {
    const { makeOpenAICompatAdapter } = await import("./openai-compat");
    const adapter = makeOpenAICompatAdapter({
      key: "test",
      baseURL: "https://api.test.com/v1",
      envKey: "TEST_KEY",
      prefixes: ["test:"],
    });

    const fn = adapter.makeGenerateWithTools({ openaiApiKey: "test-key" });
    expect(typeof fn).toBe("function");
  });

  it("adapter makeStreamWithTools returns a callable function", async () => {
    const { makeOpenAICompatAdapter } = await import("./openai-compat");
    const adapter = makeOpenAICompatAdapter({
      key: "test",
      baseURL: "https://api.test.com/v1",
      envKey: "TEST_KEY",
      prefixes: ["test:"],
    });

    const fn = adapter.makeStreamWithTools({});
    expect(typeof fn).toBe("function");
  });

  it("perplexity sonar prefix is matched before generic llama prefix", async () => {
    await import("./openai-compat");
    const { getProvider } = await import("./registry");
    // "llama-3.1-sonar-large" should match perplexity's "llama-3.1-sonar" prefix
    const match = getProvider("llama-3.1-sonar-large-128k-online");
    expect(match?.key).toBe("perplexity");
  });
});
