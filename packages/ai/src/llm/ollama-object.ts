import type { LLMConfig, JsonSchema, GenerateObjectResult } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import { validateOllamaUrl } from "./ollama-client";
import type { LLMMessage } from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  return { ...LLM_DEFAULTS, ...config, provider: "ollama" as const };
}

export async function generateObject<T = unknown>(
  messages: LLMMessage[],
  _schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): Promise<GenerateObjectResult<T>> {
  const resolved = resolveConfig(config);
  const baseUrl = resolved.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl;
  validateOllamaUrl(baseUrl);

  const model = resolved.ollamaModel || LLM_DEFAULTS.ollamaModel;

  const ollamaMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      format: "json",
      stream: false,
      options: {
        temperature: resolved.temperature,
        num_predict: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      },
    }),
    signal: AbortSignal.timeout(resolved.timeoutMs || LLM_DEFAULTS.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data.message?.content || "{}";

  return {
    object: JSON.parse(rawContent) as T,
    rawContent,
    usage: {
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
    },
  };
}
