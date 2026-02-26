import type { LLMBridge } from "./llm-bridge.js";

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
  const { ai, calculateModelCost } = await import("@fabrk/ai");

  const userMessage = [...messages].reverse().find((m) => m.role === "user");
  const systemMessage = messages.find((m) => m.role === "system");

  const result = await ai.generate({
    prompt: userMessage?.content ?? "",
    feature: `agent:${bridge.resolvedModel}`,
    model: bridge.resolvedModel,
    systemPrompt: systemMessage?.content,
  });

  if (!result.success) {
    throw new Error(result.error?.message ?? "LLM call failed");
  }

  const promptTokens = Math.ceil(
    messages.reduce((sum, m) => sum + m.content.length, 0) / 4
  );
  const completionTokens = Math.ceil(
    (result.data?.content.length ?? 0) / 4
  );

  const { costUSD } = calculateModelCost(
    bridge.resolvedModel,
    promptTokens,
    completionTokens
  );

  return {
    content: result.data?.content ?? "",
    usage: { promptTokens, completionTokens },
    cost: costUSD,
  };
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
