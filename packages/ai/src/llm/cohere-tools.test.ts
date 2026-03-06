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

describe("cohere-tools — streamWithTools", () => {
   
  let fetchSpy: any;

  function makeSSEStream(lines: string[]): Response {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + "\n"));
        }
        controller.close();
      },
    });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  async function collectEvents(
    gen: AsyncGenerator<Record<string, unknown>>
  ): Promise<Array<Record<string, unknown>>> {
    const events: Array<Record<string, unknown>> = [];
    for await (const event of gen) {
      events.push(event as Record<string, unknown>);
    }
    return events;
  }

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("yields text-delta events from content-delta SSE lines", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeSSEStream([
        `data: ${JSON.stringify({ type: "content-delta", delta: { message: { content: { text: "Hello" } } } })}`,
        `data: ${JSON.stringify({ type: "content-delta", delta: { message: { content: { text: " world" } } } })}`,
        `data: ${JSON.stringify({ type: "message-end", delta: { usage: { input_tokens: 10, output_tokens: 5 } } })}`,
      ])
    );

    const { streamWithTools } = await import("./cohere-tools");
    const events = await collectEvents(
      streamWithTools(MESSAGES, [], {
        ...({ providerApiKey: "test-key" } as Record<string, unknown>),
      }) as AsyncGenerator<Record<string, unknown>>
    );

    const textDeltas = events.filter((e) => e.type === "text-delta");
    expect(textDeltas).toHaveLength(2);
    expect(textDeltas[0].content).toBe("Hello");
    expect(textDeltas[1].content).toBe(" world");

    const usageEvents = events.filter((e) => e.type === "usage");
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0].promptTokens).toBe(10);
    expect(usageEvents[0].completionTokens).toBe(5);
  });

  it("accumulates tool calls across tool-call-start/delta/end events", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeSSEStream([
        `data: ${JSON.stringify({ type: "tool-call-start", delta: { message: { tool_calls: { id: "tc1", function: { name: "get_weather" } } } } })}`,
        `data: ${JSON.stringify({ type: "tool-call-delta", delta: { message: { tool_calls: { id: "tc1", function: { arguments: '{"location"' } } } } })}`,
        `data: ${JSON.stringify({ type: "tool-call-delta", delta: { message: { tool_calls: { id: "tc1", function: { arguments: ':"London"}' } } } } })}`,
        `data: ${JSON.stringify({ type: "tool-call-end" })}`,
      ])
    );

    const { streamWithTools } = await import("./cohere-tools");
    const events = await collectEvents(
      streamWithTools(MESSAGES, [TOOL], {
        ...({ providerApiKey: "test-key" } as Record<string, unknown>),
      }) as AsyncGenerator<Record<string, unknown>>
    );

    const toolCalls = events.filter((e) => e.type === "tool-call");
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].id).toBe("tc1");
    expect(toolCalls[0].name).toBe("get_weather");
    expect(toolCalls[0].arguments).toEqual({ location: "London" });
  });

  it("throws on non-OK streaming response", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const { streamWithTools } = await import("./cohere-tools");
    await expect(
      collectEvents(
        streamWithTools(MESSAGES, [], {
          ...({ providerApiKey: "bad-key" } as Record<string, unknown>),
        }) as AsyncGenerator<Record<string, unknown>>
      )
    ).rejects.toThrow("Cohere API error: 403");
  });

  it("skips [DONE] and blank lines", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeSSEStream([
        "",
        "data: [DONE]",
        "",
      ])
    );

    const { streamWithTools } = await import("./cohere-tools");
    const events = await collectEvents(
      streamWithTools(MESSAGES, [], {
        ...({ providerApiKey: "test-key" } as Record<string, unknown>),
      }) as AsyncGenerator<Record<string, unknown>>
    );

    expect(events).toHaveLength(0);
  });
});
