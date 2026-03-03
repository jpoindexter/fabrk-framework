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
    case "openai":
    default: {
      const { streamObject: fn } = await import("./openai-object");
      yield* fn<T>(messages, schema, config);
      break;
    }
  }
}
