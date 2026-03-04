import type { LLMBridge } from "./llm-bridge";
import type { LLMMessage, LLMContentPart, LLMToolSchema, LLMToolResult, LLMStreamEvent, GenerationOptions } from "@fabrk/ai";

export interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
}

type Message = { role: string; content: string | unknown[] };

export async function callLLM(
  bridge: LLMBridge,
  messages: Message[]
): Promise<LLMCallResult> {
  const { calculateModelCost } = await import("@fabrk/ai");

  const llmMessages: LLMMessage[] = messages.map((m) => ({
    role: m.role as LLMMessage["role"],
    content: m.content as string | LLMContentPart[],
  }));

  const generateFn = await resolveGenerateWithTools(bridge);
  const result = await generateFn(llmMessages, []);

  const { costUSD } = calculateModelCost(
    bridge.resolvedModel,
    result.usage.promptTokens,
    result.usage.completionTokens
  );

  return {
    content: result.content ?? "",
    usage: result.usage,
    cost: costUSD,
  };
}

async function resolveGenerateWithTools(bridge: LLMBridge) {
  try {
    const { getProviderByKey } = await import("@fabrk/ai");
    const adapter = getProviderByKey(bridge.provider);
    if (adapter) {
      return adapter.makeGenerateWithTools({
        openaiModel: bridge.resolvedModel,
        anthropicModel: bridge.resolvedModel,
        // Pass resolved model via _model for registry adapters
        ...({ _model: bridge.resolvedModel } as Record<string, unknown>),
      });
    }
  } catch {
    // Fall through to hardcoded providers
  }

  if (bridge.provider === "anthropic") {
    const { anthropicGenerateWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: never[]) =>
      anthropicGenerateWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
  }
  if (bridge.provider === "google") {
    const { googleGenerateWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: never[]) =>
      googleGenerateWithTools(msgs, tools, { googleModel: bridge.resolvedModel });
  }
  if (bridge.provider === "ollama") {
    const { ollamaGenerateWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: never[]) =>
      ollamaGenerateWithTools(msgs, tools, { ollamaModel: bridge.resolvedModel });
  }
  const { openaiGenerateWithTools } = await import("@fabrk/ai");
  return (msgs: LLMMessage[], tools: never[]) =>
    openaiGenerateWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
}

const MAX_RETRIES = 3;

function extractStatusCode(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as Record<string, unknown>).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

async function callWithRetry(bridge: LLMBridge, messages: Message[]): Promise<LLMCallResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callLLM(bridge, messages);
    } catch (err) {
      const status = extractStatusCode(err);
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (attempt < MAX_RETRIES - 1 && retryable) {
        // Exponential backoff with full jitter: 1s, 2s, 4s ± up to 200ms
        const delay = Math.min(1000 * 2 ** attempt + Math.random() * 200, 8000);
        console.warn(`[fabrk] Model ${bridge.resolvedModel} returned ${status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("[fabrk] callWithRetry: no attempts configured");
}

export async function resolveToolGenerateFn(
  bridge: Pick<LLMBridge, "provider" | "resolvedModel">
): Promise<(msgs: LLMMessage[], tools: LLMToolSchema[], opts?: GenerationOptions) => Promise<LLMToolResult>> {
  try {
    const { getProviderByKey } = await import("@fabrk/ai");
    const adapter = getProviderByKey(bridge.provider);
    if (adapter) {
      return adapter.makeGenerateWithTools({
        openaiModel: bridge.resolvedModel,
        anthropicModel: bridge.resolvedModel,
        ...({ _model: bridge.resolvedModel } as Record<string, unknown>),
      });
    }
  } catch {
    // Fall through to core providers
  }
  if (bridge.provider === "anthropic") {
    const { anthropicGenerateWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
      anthropicGenerateWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
  }
  const { openaiGenerateWithTools } = await import("@fabrk/ai");
  return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
    openaiGenerateWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
}

export async function resolveToolStreamFn(
  bridge: Pick<LLMBridge, "provider" | "resolvedModel">
): Promise<(msgs: LLMMessage[], tools: LLMToolSchema[], opts?: GenerationOptions) => AsyncGenerator<LLMStreamEvent>> {
  try {
    const { getProviderByKey } = await import("@fabrk/ai");
    const adapter = getProviderByKey(bridge.provider);
    if (adapter) {
      return adapter.makeStreamWithTools({
        openaiModel: bridge.resolvedModel,
        anthropicModel: bridge.resolvedModel,
        ...({ _model: bridge.resolvedModel } as Record<string, unknown>),
      });
    }
  } catch {
    // Fall through to core providers
  }
  if (bridge.provider === "anthropic") {
    const { anthropicStreamWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
      anthropicStreamWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
  }
  const { openaiStreamWithTools } = await import("@fabrk/ai");
  return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
    openaiStreamWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
}

export async function callWithFallback(
  primary: LLMBridge,
  fallbacks: LLMBridge[],
  messages: Message[]
): Promise<LLMCallResult> {
  const models = [primary, ...fallbacks];

  let lastError: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      return await callWithRetry(models[i], messages);
    } catch (err) {
      lastError = err;
      if (i < models.length - 1) {
        console.warn(
          `[fabrk] Model ${models[i].resolvedModel} failed, trying ${models[i + 1].resolvedModel}`
        );
      }
    }
  }

  throw lastError ?? new Error("No models available");
}
