import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMToolCall,
  LLMStreamEvent,
} from "./tool-types";
import { registerProvider } from "./registry";

function resolveModel(config: Partial<LLMConfig>): string {
  const raw = (config as Record<string, unknown>)._model as string || "";
  return raw.startsWith("bedrock:") ? raw.slice(8) : raw;
}

interface BedrockMessage {
  role: "user" | "assistant";
  content: Array<
    | { text: string }
    | { toolUse: { toolUseId: string; name: string; input: Record<string, unknown> } }
    | { toolResult: { toolUseId: string; content: Array<{ text: string }> } }
  >;
}

function toBedrockMessages(messages: LLMMessage[]): {
  system?: Array<{ text: string }>;
  messages: BedrockMessage[];
} {
  let system: Array<{ text: string }> | undefined;
  const out: BedrockMessage[] = [];

  function toText(content: LLMMessage["content"]): string {
    if (typeof content === "string") return content;
    return content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  for (const m of messages) {
    if (m.role === "system") {
      system = [{ text: m.content as string }];
      continue;
    }
    if (m.role === "tool") {
      out.push({
        role: "user",
        content: [
          {
            toolResult: {
              toolUseId: m.toolCallId || "",
              content: [{ text: toText(m.content) }],
            },
          },
        ],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      const content: BedrockMessage["content"] = [];
      const text = toText(m.content);
      if (text) content.push({ text });
      for (const tc of m.toolCalls) {
        content.push({
          toolUse: { toolUseId: tc.id, name: tc.name, input: tc.arguments },
        });
      }
      out.push({ role: "assistant", content });
      continue;
    }
    out.push({
      role: m.role === "user" ? "user" : "assistant",
      content: [{ text: toText(m.content) }],
    });
  }

  return { system, messages: out };
}

function toBedrockTools(tools: LLMToolSchema[]): unknown[] {
  return tools.map((t) => ({
    toolSpec: {
      name: t.function.name,
      description: t.function.description,
      inputSchema: { json: t.function.parameters },
    },
  }));
}

function parseResponseToolCalls(output: Record<string, unknown>): {
  content: string | null;
  toolCalls: LLMToolCall[];
} {
  const contentBlocks = output.content as Array<Record<string, unknown>> | undefined;
  let textContent: string | null = null;
  const toolCalls: LLMToolCall[] = [];

  if (Array.isArray(contentBlocks)) {
    for (const block of contentBlocks) {
      if (block.text) {
        textContent = block.text as string;
      }
      if (block.toolUse) {
        const tu = block.toolUse as { toolUseId: string; name: string; input: Record<string, unknown> };
        toolCalls.push({
          id: tu.toolUseId,
          name: tu.name,
          arguments: tu.input,
        });
      }
    }
  }

  return { content: textContent, toolCalls };
}

export async function generateWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): Promise<LLMToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let BedrockClient: any, ConverseCommand: any;
  try {
    const mod = await import("@aws-sdk/client-bedrock-runtime");
    BedrockClient = mod.BedrockRuntimeClient;
    ConverseCommand = mod.ConverseCommand;
  } catch {
    throw new Error(
      "@aws-sdk/client-bedrock-runtime not installed. Install with: npm install @aws-sdk/client-bedrock-runtime"
    );
  }

  const modelId = resolveModel(config);
  const { system, messages: bedrockMessages } = toBedrockMessages(messages);

  const input: Record<string, unknown> = {
    modelId,
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: Math.min(config.maxTokens ?? LLM_DEFAULTS.maxTokens, MAX_TOKENS_LIMIT),
      temperature: config.temperature ?? LLM_DEFAULTS.temperature,
    },
  };
  if (system) input.system = system;
  if (tools.length > 0) input.toolConfig = { tools: toBedrockTools(tools) };

  const region = (config as Record<string, unknown>).providerOptions as
    Record<string, unknown> | undefined;
  const client = new BedrockClient({ region: region?.region || "us-east-1" });
  const response = await client.send(new ConverseCommand(input));

  const output = response.output as Record<string, unknown> | undefined;
  const { content, toolCalls } = output?.message
    ? parseResponseToolCalls(output.message as Record<string, unknown>)
    : { content: null, toolCalls: [] };

  const usage = response.usage as { inputTokens?: number; outputTokens?: number } | undefined;

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
    },
  };
}

export async function* streamWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<LLMStreamEvent> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let BedrockClient: any, ConverseStreamCommand: any;
  try {
    const mod = await import("@aws-sdk/client-bedrock-runtime");
    BedrockClient = mod.BedrockRuntimeClient;
    ConverseStreamCommand = mod.ConverseStreamCommand;
  } catch {
    throw new Error(
      "@aws-sdk/client-bedrock-runtime not installed. Install with: npm install @aws-sdk/client-bedrock-runtime"
    );
  }

  const modelId = resolveModel(config);
  const { system, messages: bedrockMessages } = toBedrockMessages(messages);

  const input: Record<string, unknown> = {
    modelId,
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: Math.min(config.maxTokens ?? LLM_DEFAULTS.maxTokens, MAX_TOKENS_LIMIT),
      temperature: config.temperature ?? LLM_DEFAULTS.temperature,
    },
  };
  if (system) input.system = system;
  if (tools.length > 0) input.toolConfig = { tools: toBedrockTools(tools) };

  const region = (config as Record<string, unknown>).providerOptions as
    Record<string, unknown> | undefined;
  const client = new BedrockClient({ region: region?.region || "us-east-1" });
  const response = await client.send(new ConverseStreamCommand(input));

  let currentToolId = "";
  let currentToolName = "";
  let currentToolInput = "";

  const stream = response.stream;
  if (!stream) return;

  for await (const event of stream) {
    if (event.contentBlockDelta) {
      const delta = event.contentBlockDelta.delta;
      if (delta?.text) {
        yield { type: "text-delta", content: delta.text };
      }
      if (delta?.toolUse?.input) {
        currentToolInput += delta.toolUse.input;
      }
    } else if (event.contentBlockStart) {
      const start = event.contentBlockStart.start;
      if (start?.toolUse) {
        currentToolId = start.toolUse.toolUseId || "";
        currentToolName = start.toolUse.name || "";
        currentToolInput = "";
      }
    } else if (event.contentBlockStop) {
      if (currentToolId) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(currentToolInput || "{}");
        } catch { /* keep empty */ }
        yield { type: "tool-call", id: currentToolId, name: currentToolName, arguments: args };
        currentToolId = "";
        currentToolName = "";
        currentToolInput = "";
      }
    } else if (event.metadata) {
      const usage = event.metadata.usage;
      if (usage) {
        yield {
          type: "usage",
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
        };
      }
    }
  }
}

registerProvider("bedrock", {
  key: "bedrock",
  prefixes: ["bedrock:"],
  envKey: "AWS_ACCESS_KEY_ID",
  makeGenerateWithTools(config) {
    return (messages, tools) => generateWithTools(messages, tools, config);
  },
  makeStreamWithTools(config) {
    return (messages, tools) => streamWithTools(messages, tools, config);
  },
});
