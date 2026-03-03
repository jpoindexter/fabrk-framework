import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LLMMessage, LLMToolSchema } from "./tool-types";

const TOOL: LLMToolSchema = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather",
    parameters: {
      type: "object",
      properties: { location: { type: "string" } },
      required: ["location"],
    },
  },
};

const MESSAGES: LLMMessage[] = [
  { role: "user", content: "What is the weather in London?" },
];

describe("cohere-tools — generateWithTools", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns text content from Cohere v2 response", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            content: [{ text: "It is sunny in London." }],
          },
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { generateWithTools } = await import("./cohere-tools");
    const result = await generateWithTools(MESSAGES, [], {
      ...({ providerApiKey: "test-key" } as Record<string, unknown>),
    });

    expect(result.content).toBe("It is sunny in London.");
    expect(result.toolCalls).toBeUndefined();
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
  });

  it("returns tool calls from Cohere response", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: {
            content: [],
            tool_calls: [
              {
                id: "tc_1",
                function: { name: "get_weather", arguments: '{"location":"London"}' },
              },
            ],
          },
          usage: { input_tokens: 15, output_tokens: 10 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { generateWithTools } = await import("./cohere-tools");
    const result = await generateWithTools(MESSAGES, [TOOL], {
      ...({ providerApiKey: "test-key" } as Record<string, unknown>),
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0]).toEqual({
      id: "tc_1",
      name: "get_weather",
      arguments: { location: "London" },
    });
  });

  it("throws on non-OK response", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const { generateWithTools } = await import("./cohere-tools");
    await expect(
      generateWithTools(MESSAGES, [], {
        ...({ providerApiKey: "bad-key" } as Record<string, unknown>),
      })
    ).rejects.toThrow("Cohere API error: 401");
  });

  it("handles missing usage gracefully", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: { content: [{ text: "hi" }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { generateWithTools } = await import("./cohere-tools");
    const result = await generateWithTools(MESSAGES, [], {
      ...({ providerApiKey: "test-key" } as Record<string, unknown>),
    });

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 });
  });

  it("sends correct request body with tools", async () => {
    let capturedBody: unknown = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSpy.mockImplementation(async (_url: any, init: any) => {
      capturedBody = JSON.parse(init.body as string);
      return new Response(
        JSON.stringify({
          message: { content: [{ text: "ok" }] },
          usage: { input_tokens: 5, output_tokens: 2 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const { generateWithTools } = await import("./cohere-tools");
    await generateWithTools(MESSAGES, [TOOL], {
      ...({ providerApiKey: "test-key" } as Record<string, unknown>),
    });

    const body = capturedBody as Record<string, unknown>;
    expect(body.model).toBeDefined();
    expect(body.messages).toBeDefined();
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
  });
});

describe("cohere-tools — provider registration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("registers cohere in the provider registry", async () => {
    await import("./cohere-tools");
    const { getProviderByKey, getProvider } = await import("./registry");

    expect(getProviderByKey("cohere")).toBeDefined();
    expect(getProviderByKey("cohere")!.key).toBe("cohere");
    expect(getProviderByKey("cohere")!.envKey).toBe("COHERE_API_KEY");

    expect(getProvider("command-r-plus")?.key).toBe("cohere");
    expect(getProvider("command-r")?.key).toBe("cohere");
  });
});
