import type { LLMBridge } from "./llm-bridge";
import type { LLMMessage } from "@fabrk/ai";

export interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
}

type Message = { role: string; content: string };

export async function callLLM(
  bridge: LLMBridge,
  messages: Message[]
): Promise<LLMCallResult> {
  const { calculateModelCost } = await import("@fabrk/ai");

  const llmMessages: LLMMessage[] = messages.map((m) => ({
    role: m.role as LLMMessage["role"],
    content: m.content,
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
  // Try registry first
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

  // Fallback for core providers
  if (bridge.provider === "anthropic") {
    const { anthropicGenerateWithTools } = await import("@fabrk/ai");
    return (msgs: LLMMessage[], tools: never[]) =>
      anthropicGenerateWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
  }
  const { openaiGenerateWithTools } = await import("@fabrk/ai");
  return (msgs: LLMMessage[], tools: never[]) =>
    openaiGenerateWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
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
      return await callLLM(models[i], messages);
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
