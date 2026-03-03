import type { LLMConfig, JsonSchema, GenerateObjectResult, StreamObjectEvent } from "./types";
import { LLM_DEFAULTS } from "./types";
import type { LLMMessage } from "./tool-types";

/**
 * Generate a structured object from an LLM response.
 *
 * Uses provider-native structured output mechanisms:
 * - OpenAI: `response_format: { type: "json_schema" }`
 * - Anthropic: tool-forcing trick (single tool with target schema)
 * - Google: `responseMimeType: "application/json"` + `responseSchema`
 * - Ollama: `format: "json"`
 *
 * Schema is a plain JSON Schema object. Validation is the caller's responsibility.
 */
export async function generateObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): Promise<GenerateObjectResult<T>> {
  const provider = config.provider || LLM_DEFAULTS.provider;

  switch (provider) {
    case "anthropic": {
      const { generateObject: fn } = await import("./anthropic-object");
      return fn<T>(messages, schema, config);
    }
    case "google": {
      const { generateObject: fn } = await import("./google-object");
      return fn<T>(messages, schema, config);
    }
    case "ollama": {
      const { generateObject: fn } = await import("./ollama-object");
      return fn<T>(messages, schema, config);
    }
    case "openai":
    default: {
      const { generateObject: fn } = await import("./openai-object");
      return fn<T>(messages, schema, config);
    }
  }
}

export async function* streamObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): AsyncGenerator<StreamObjectEvent<T>> {
  const provider = config.provider || LLM_DEFAULTS.provider;
  switch (provider) {
    case "anthropic": {
      const { streamObject: fn } = await import("./anthropic-object");
      yield* fn<T>(messages, schema, config);
      break;
    }
    case "google": {
      const { streamObject: fn } = await import("./google-object");
      yield* fn<T>(messages, schema, config);
      break;
    }
    case "ollama": {
      const { streamObject: fn } = await import("./ollama-object");
      yield* fn<T>(messages, schema, config);
      break;
    }
    case "openai":
    default: {
      const { streamObject: fn } = await import("./openai-object");
      yield* fn<T>(messages, schema, config);
      break;
    }
  }
}

/**
 * Streams structured output, yielding partial typed objects as JSON accumulates.
 * Equivalent to Vercel AI SDK's `partialOutputStream`.
 *
 * Each yield is a best-effort partial parse of the accumulated JSON buffer.
 * The final yield is always the fully-parsed object.
 *
 * @example
 *   for await (const partial of streamObjectPartial<Recipe>(messages, schema)) {
 *     console.log(partial.name); // available before full response
 *   }
 */
export async function* streamObjectPartial<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): AsyncGenerator<Partial<T>> {
  let buffer = '';
  for await (const event of streamObject<T>(messages, schema, config)) {
    if (event.type === 'delta') {
      buffer += event.text;
      const partial = tryPartialParse<T>(buffer);
      if (partial !== null) yield partial;
    } else if (event.type === 'done') {
      yield event.object as T;
    } else if (event.type === 'error') {
      throw new Error(event.message);
    }
  }
}

function tryPartialParse<T>(text: string): Partial<T> | null {
  const t = text.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return null;
  try { return JSON.parse(t) as T; } catch { /* try partial below */ }
  const openBrace = (t.match(/\{/g) ?? []).length - (t.match(/\}/g) ?? []).length;
  const openBracket = (t.match(/\[/g) ?? []).length - (t.match(/\]/g) ?? []).length;
  const closed = t + ']'.repeat(Math.max(0, openBracket)) + '}'.repeat(Math.max(0, openBrace));
  try { return JSON.parse(closed) as T; } catch { return null; }
}
