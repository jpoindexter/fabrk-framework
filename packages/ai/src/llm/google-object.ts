import type { LLMConfig, JsonSchema, GenerateObjectResult, StreamObjectEvent } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type { LLMMessage } from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  const merged = { ...LLM_DEFAULTS, ...config, provider: "google" as const };
  if (!merged.googleApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.googleApiKey = proc?.env?.GOOGLE_API_KEY || "";
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
  let GoogleGenerativeAI: any;
  try {
    const mod = await import("@google/generative-ai");
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch {
    throw new Error(
      "@google/generative-ai not installed. Install with: npm install @google/generative-ai"
    );
  }

  const client = new GoogleGenerativeAI(resolved.googleApiKey);
  const model = client.getGenerativeModel({
    model: resolved.googleModel || LLM_DEFAULTS.googleModel,
  });

  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemInstruction = { parts: [{ text: m.content as string }] };
      continue;
    }
    const text = typeof m.content === "string"
      ? m.content
      : m.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  const result = await model.generateContent({
    systemInstruction,
    contents,
    generationConfig: {
      maxOutputTokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const rawContent = result.response.text() || "{}";
  const usage = result.response.usageMetadata ?? {};

  return {
    object: JSON.parse(rawContent) as T,
    rawContent,
    usage: {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
    },
  };
}

export async function* streamObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): AsyncGenerator<StreamObjectEvent<T>> {
  try {
    const result = await generateObject<T>(messages, schema, config);
    yield { type: "done", object: result.object, usage: result.usage };
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : "streamObject failed" };
  }
}
