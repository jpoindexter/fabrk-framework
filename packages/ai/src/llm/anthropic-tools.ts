import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMStreamEvent,
} from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  const merged = { ...LLM_DEFAULTS, ...config, provider: "anthropic" as const };
  if (!merged.anthropicApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.anthropicApiKey = proc?.env?.ANTHROPIC_API_KEY || "";
  }
  return merged;
}

function toAnthropicMessages(messages: LLMMessage[]): { system?: string; messages: unknown[] } {
  let system: string | undefined;
  const out: unknown[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      system = m.content;
      continue;
    }
    if (m.role === "tool") {
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.toolCallId,
            content: m.content,
          },
        ],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
      }
      out.push({ role: "assistant", content });
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }

  return { system, messages: out };
}

function toAnthropicTools(tools: LLMToolSchema[]): unknown[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

export async function generateWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): Promise<LLMToolResult> {
  const resolved = resolveConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Anthropic: any;
  try {
    const mod = await import("@anthropic-ai/sdk");
    Anthropic = mod.default || mod.Anthropic || mod;
  } catch {
    throw new Error("@anthropic-ai/sdk not installed. Install with: npm install @anthropic-ai/sdk");
  }

  const client = new Anthropic({ apiKey: resolved.anthropicApiKey });
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const response = await client.messages.create(
    {
      model: resolved.anthropicModel || LLM_DEFAULTS.anthropicModel,
      max_tokens: Math.min(resolved.maxTokens ?? 4096, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      system,
      messages: anthropicMessages,
      tools: tools.length > 0 ? toAnthropicTools(tools) : undefined,
    },
    { timeout: resolved.timeoutMs }
  );

  let textContent: string | null = null;
  const toolCalls = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const block of response.content as any[]) {
    if (block.type === "text") {
      textContent = block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: response.usage?.input_tokens ?? 0,
      completionTokens: response.usage?.output_tokens ?? 0,
    },
  };
}

export async function* streamWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<LLMStreamEvent> {
  const resolved = resolveConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Anthropic: any;
  try {
    const mod = await import("@anthropic-ai/sdk");
    Anthropic = mod.default || mod.Anthropic || mod;
  } catch {
    throw new Error("@anthropic-ai/sdk not installed. Install with: npm install @anthropic-ai/sdk");
  }

  const client = new Anthropic({ apiKey: resolved.anthropicApiKey });
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const stream = client.messages.stream(
    {
      model: resolved.anthropicModel || LLM_DEFAULTS.anthropicModel,
      max_tokens: Math.min(resolved.maxTokens ?? 4096, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      system,
      messages: anthropicMessages,
      tools: tools.length > 0 ? toAnthropicTools(tools) : undefined,
    },
    { timeout: resolved.timeoutMs }
  );

  // Track current tool use block
  let currentToolId = "";
  let currentToolName = "";
  let currentToolInput = "";

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const block = (event as any).content_block;
      if (block?.type === "tool_use") {
        currentToolId = block.id;
        currentToolName = block.name;
        currentToolInput = "";
      }
    } else if (event.type === "content_block_delta") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delta = (event as any).delta;
      if (delta?.type === "text_delta") {
        yield { type: "text-delta", content: delta.text };
      } else if (delta?.type === "input_json_delta") {
        currentToolInput += delta.partial_json;
      }
    } else if (event.type === "content_block_stop") {
      if (currentToolId) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(currentToolInput || "{}");
        } catch { /* keep empty */ }
        yield {
          type: "tool-call",
          id: currentToolId,
          name: currentToolName,
          arguments: args,
        };
        currentToolId = "";
        currentToolName = "";
        currentToolInput = "";
      }
    } else if (event.type === "message_delta") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = (event as any).usage;
      if (usage) {
        yield {
          type: "usage",
          promptTokens: 0, // Anthropic sends input tokens on message_start
          completionTokens: usage.output_tokens ?? 0,
        };
      }
    } else if (event.type === "message_start") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = (event as any).message?.usage;
      if (usage) {
        yield {
          type: "usage",
          promptTokens: usage.input_tokens ?? 0,
          completionTokens: 0,
        };
      }
    }
  }
}
