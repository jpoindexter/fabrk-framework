import type { LLMConfig, JsonSchema, GenerateObjectResult, StreamObjectEvent } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type { LLMMessage } from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  const merged = { ...LLM_DEFAULTS, ...config, provider: "anthropic" as const };
  if (!merged.anthropicApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.anthropicApiKey = proc?.env?.ANTHROPIC_API_KEY || "";
  }
  return merged;
}

function extractSystemAndMessages(messages: LLMMessage[]): { system?: string; messages: unknown[] } {
  let system: string | undefined;
  const out: unknown[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      // system content is always a string
      system = m.content as string;
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }

  return { system, messages: out };
}

export async function generateObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): Promise<GenerateObjectResult<T>> {
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
  const { system, messages: anthropicMessages } = extractSystemAndMessages(messages);

  // Tool-forcing trick: define a single tool with the target schema,
  // force Anthropic to call it, then extract the structured input
  const toolName = "__structured_output";
  const response = await client.messages.create(
    {
      model: resolved.anthropicModel || LLM_DEFAULTS.anthropicModel,
      max_tokens: Math.min(resolved.maxTokens ?? 4096, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      system,
      messages: anthropicMessages,
      tools: [{
        name: toolName,
        description: "Return the structured output matching the requested schema.",
        input_schema: schema,
      }],
      tool_choice: { type: "tool", name: toolName },
    },
    { timeout: resolved.timeoutMs }
  );

  let rawObject: Record<string, unknown> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const block of response.content as any[]) {
    if (block.type === "tool_use" && block.name === toolName) {
      rawObject = block.input as Record<string, unknown>;
      break;
    }
  }

  const rawContent = JSON.stringify(rawObject);

  return {
    object: rawObject as T,
    rawContent,
    usage: {
      promptTokens: response.usage?.input_tokens ?? 0,
      completionTokens: response.usage?.output_tokens ?? 0,
    },
  };
}

export async function* streamObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): AsyncGenerator<StreamObjectEvent<T>> {
  const resolved = resolveConfig(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Anthropic: any;
  try {
    const mod = await import("@anthropic-ai/sdk");
    Anthropic = mod.default || mod.Anthropic || mod;
  } catch {
    throw new Error("@anthropic-ai/sdk not installed.");
  }

  const client = new Anthropic({ apiKey: resolved.anthropicApiKey });
  const { system, messages: anthropicMessages } = extractSystemAndMessages(messages);
  const toolName = "__structured_output";

  const stream = client.messages.stream(
    {
      model: resolved.anthropicModel || LLM_DEFAULTS.anthropicModel,
      max_tokens: Math.min(resolved.maxTokens ?? 4096, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      system,
      messages: anthropicMessages,
      tools: [{ name: toolName, description: "Return structured output.", input_schema: schema }],
      tool_choice: { type: "tool", name: toolName },
    },
    { timeout: resolved.timeoutMs }
  );

  let accumulated = "";
  let promptTokens = 0;
  let completionTokens = 0;

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delta = (event as any).delta;
      if (delta?.type === "input_json_delta") {
        accumulated += delta.partial_json;
        yield { type: "delta", text: delta.partial_json };
      }
    } else if (event.type === "message_start") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = (event as any).message?.usage;
      if (usage) promptTokens = usage.input_tokens ?? 0;
    } else if (event.type === "message_delta") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = (event as any).usage;
      if (usage) completionTokens = usage.output_tokens ?? 0;
    }
  }

  try {
    const object = JSON.parse(accumulated || "{}") as T;
    yield { type: "done", object, usage: { promptTokens, completionTokens } };
  } catch {
    yield { type: "error", message: "Failed to parse streamed JSON response" };
  }
}
