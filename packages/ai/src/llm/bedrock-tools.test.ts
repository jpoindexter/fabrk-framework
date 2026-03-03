import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("bedrock-tools — generateWithTools", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns text content from Bedrock Converse response", async () => {
    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        async send() {
          return {
            output: {
              message: {
                content: [{ text: "It is sunny." }],
              },
            },
            usage: { inputTokens: 10, outputTokens: 5 },
          };
        }
      },
      ConverseCommand: class {
        constructor(public input: unknown) {}
      },
    }));

    const { generateWithTools } = await import("./bedrock-tools");
    const result = await generateWithTools(MESSAGES, [], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });

    expect(result.content).toBe("It is sunny.");
    expect(result.toolCalls).toBeUndefined();
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
  });

  it("returns tool calls from Bedrock response", async () => {
    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        async send() {
          return {
            output: {
              message: {
                content: [
                  {
                    toolUse: {
                      toolUseId: "tu_1",
                      name: "get_weather",
                      input: { location: "London" },
                    },
                  },
                ],
              },
            },
            usage: { inputTokens: 20, outputTokens: 10 },
          };
        }
      },
      ConverseCommand: class {
        constructor(public input: unknown) {}
      },
    }));

    const { generateWithTools } = await import("./bedrock-tools");
    const result = await generateWithTools(MESSAGES, [TOOL], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0]).toEqual({
      id: "tu_1",
      name: "get_weather",
      arguments: { location: "London" },
    });
  });

  it("strips bedrock: prefix from model ID", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedInput: any = null;

    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async send(cmd: any) {
          capturedInput = cmd.input;
          return {
            output: { message: { content: [{ text: "ok" }] } },
            usage: { inputTokens: 5, outputTokens: 2 },
          };
        }
      },
      ConverseCommand: class {
        input: unknown;
        constructor(input: unknown) {
          this.input = input;
        }
      },
    }));

    const { generateWithTools } = await import("./bedrock-tools");
    await generateWithTools(MESSAGES, [], {
      ...({ _model: "bedrock:anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });

    expect(capturedInput?.modelId).toBe("anthropic.claude-3-5-sonnet");
  });

  it("throws when @aws-sdk/client-bedrock-runtime is not installed", async () => {
    vi.doMock("@aws-sdk/client-bedrock-runtime", () => {
      throw new Error("Cannot find module @aws-sdk/client-bedrock-runtime");
    });

    const { generateWithTools } = await import("./bedrock-tools");
    await expect(
      generateWithTools(MESSAGES, [], {
        ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
      })
    ).rejects.toThrow("@aws-sdk/client-bedrock-runtime not installed");
  });

  it("handles missing usage gracefully", async () => {
    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        async send() {
          return {
            output: { message: { content: [{ text: "hi" }] } },
            usage: undefined,
          };
        }
      },
      ConverseCommand: class {
        constructor(public input: unknown) {}
      },
    }));

    const { generateWithTools } = await import("./bedrock-tools");
    const result = await generateWithTools(MESSAGES, [], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 });
  });

  it("extracts system messages for Bedrock format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedInput: any = null;

    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async send(cmd: any) {
          capturedInput = cmd.input;
          return {
            output: { message: { content: [{ text: "ok" }] } },
            usage: { inputTokens: 5, outputTokens: 2 },
          };
        }
      },
      ConverseCommand: class {
        input: unknown;
        constructor(input: unknown) {
          this.input = input;
        }
      },
    }));

    const { generateWithTools } = await import("./bedrock-tools");
    const messagesWithSystem: LLMMessage[] = [
      { role: "system", content: "You are a weather assistant." },
      { role: "user", content: "London weather?" },
    ];
    await generateWithTools(messagesWithSystem, [], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });

    expect(capturedInput?.system).toEqual([{ text: "You are a weather assistant." }]);
    const msgs = capturedInput?.messages as Array<{ role: string }>;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
  });
});

describe("bedrock-tools — streamWithTools", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when @aws-sdk/client-bedrock-runtime is not installed", async () => {
    vi.doMock("@aws-sdk/client-bedrock-runtime", () => {
      throw new Error("Cannot find module @aws-sdk/client-bedrock-runtime");
    });

    const { streamWithTools } = await import("./bedrock-tools");
    const gen = streamWithTools(MESSAGES, [], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    });
    await expect(gen.next()).rejects.toThrow("@aws-sdk/client-bedrock-runtime not installed");
  });

  it("yields text-delta and usage events from stream", async () => {
    async function* fakeStream() {
      yield { contentBlockDelta: { delta: { text: "Hello" } } };
      yield { contentBlockDelta: { delta: { text: " world" } } };
      yield { metadata: { usage: { inputTokens: 10, outputTokens: 5 } } };
    }

    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        async send() {
          return { stream: fakeStream() };
        }
      },
      ConverseStreamCommand: class {
        constructor(public input: unknown) {}
      },
    }));

    const { streamWithTools } = await import("./bedrock-tools");
    const events = [];
    for await (const e of streamWithTools(MESSAGES, [], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    })) {
      events.push(e);
    }

    const textEvents = events.filter((e) => e.type === "text-delta");
    expect(textEvents).toHaveLength(2);
    expect(textEvents[0]).toEqual({ type: "text-delta", content: "Hello" });

    const usageEvents = events.filter((e) => e.type === "usage");
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0]).toEqual({ type: "usage", promptTokens: 10, completionTokens: 5 });
  });

  it("yields tool-call events from stream", async () => {
    async function* fakeStream() {
      yield {
        contentBlockStart: {
          start: { toolUse: { toolUseId: "tu_1", name: "get_weather" } },
        },
      };
      yield {
        contentBlockDelta: {
          delta: { toolUse: { input: '{"location":"London"}' } },
        },
      };
      yield { contentBlockStop: {} };
    }

    vi.doMock("@aws-sdk/client-bedrock-runtime", () => ({
      BedrockRuntimeClient: class {
        async send() {
          return { stream: fakeStream() };
        }
      },
      ConverseStreamCommand: class {
        constructor(public input: unknown) {}
      },
    }));

    const { streamWithTools } = await import("./bedrock-tools");
    const events = [];
    for await (const e of streamWithTools(MESSAGES, [TOOL], {
      ...({ _model: "anthropic.claude-3-5-sonnet" } as Record<string, unknown>),
    })) {
      events.push(e);
    }

    const toolEvents = events.filter((e) => e.type === "tool-call");
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0]).toEqual({
      type: "tool-call",
      id: "tu_1",
      name: "get_weather",
      arguments: { location: "London" },
    });
  });
});

describe("bedrock-tools — provider registration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("registers bedrock in the provider registry", async () => {
    await import("./bedrock-tools");
    const { getProviderByKey, getProvider } = await import("./registry");

    expect(getProviderByKey("bedrock")).toBeDefined();
    expect(getProviderByKey("bedrock")!.key).toBe("bedrock");
    expect(getProviderByKey("bedrock")!.envKey).toBe("AWS_ACCESS_KEY_ID");
    expect(getProvider("bedrock:anthropic.claude-3-5-sonnet")?.key).toBe("bedrock");
  });
});
