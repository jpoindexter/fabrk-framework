import type { LLMConfig, JsonSchema, GenerateObjectResult, StreamObjectEvent } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type { LLMMessage } from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  const merged = { ...LLM_DEFAULTS, ...config, provider: "openai" as const };
  if (!merged.openaiApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.openaiApiKey = proc?.env?.OPENAI_API_KEY || "";
  }
  return merged;
}

export async function generateObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): Promise<GenerateObjectResult<T>> {
  const resolved = resolveConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OpenAI: any;
  try {
    const mod = await import("openai");
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch {
    throw new Error("openai package not installed. Install with: npm install openai");
  }

  const client = new OpenAI({
    apiKey: resolved.openaiApiKey,
    ...(resolved.providerBaseUrl ? { baseURL: resolved.providerBaseUrl } : {}),
  });
  const response = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", strict: true, schema },
      },
    },
    { timeout: resolved.timeoutMs }
  );

  const rawContent = response.choices[0]?.message?.content || "{}";
  const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

  return {
    object: JSON.parse(rawContent) as T,
    rawContent,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
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
  let OpenAI: any;
  try {
    const mod = await import("openai");
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch {
    throw new Error("openai package not installed.");
  }

  const client = new OpenAI({
    apiKey: resolved.openaiApiKey,
    ...(resolved.providerBaseUrl ? { baseURL: resolved.providerBaseUrl } : {}),
  });
  const stream = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      response_format: { type: "json_schema", json_schema: { name: "response", strict: true, schema } },
      stream: true,
      stream_options: { include_usage: true },
    },
    { timeout: resolved.timeoutMs }
  );

  let accumulated = "";
  let promptTokens = 0;
  let completionTokens = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      accumulated += delta;
      yield { type: "delta", text: delta };
    }
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? 0;
      completionTokens = chunk.usage.completion_tokens ?? 0;
    }
  }

  try {
    const object = JSON.parse(accumulated) as T;
    yield { type: "done", object, usage: { promptTokens, completionTokens } };
  } catch {
    yield { type: "error", message: "Failed to parse streamed JSON response" };
  }
}
