import type { LLMBridge } from "./llm-bridge.js";

export interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
}

type Message = { role: string; content: string };

/**
 * Call an LLM using @fabrk/ai's integration layer.
 * Handles provider detection and cost calculation.
 */
export async function callLLM(
  bridge: LLMBridge,
  messages: Message[],
  _stream: boolean
): Promise<LLMCallResult> {
  const { ai, calculateModelCost } = await import("@fabrk/ai");

  // Use the last user message as the prompt
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

  // Estimate tokens from content length (rough heuristic)
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

/**
 * Try the primary model, then each fallback in order.
 * Returns the first successful result.
 */
export async function callWithFallback(
  primary: LLMBridge,
  fallbacks: LLMBridge[],
  messages: Message[],
  stream: boolean
): Promise<LLMCallResult> {
  const models = [primary, ...fallbacks];

  for (let i = 0; i < models.length; i++) {
    try {
      return await callLLM(models[i], messages, stream);
    } catch (err) {
      const isLast = i === models.length - 1;
      if (isLast) throw err;
      console.warn(
        `[fabrk] Model ${models[i].resolvedModel} failed, trying ${models[i + 1].resolvedModel}: ${err}`
      );
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error("No models available");
}
