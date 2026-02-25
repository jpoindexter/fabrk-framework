import type { LLMBridge } from "./llm-bridge.js";

export interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
}

type Message = { role: string; content: string };

/**
 * Call an LLM using @fabrk/ai's chat() function.
 * Handles provider detection, streaming vs non-streaming, and cost calculation.
 */
export async function callLLM(
  bridge: LLMBridge,
  messages: Message[],
  stream: boolean
): Promise<LLMCallResult> {
  const { chat, calculateModelCost } = await import("@fabrk/ai");

  const response = await chat({
    messages: messages as Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>,
    provider: bridge.provider === "google" ? "openai" : bridge.provider as "openai" | "anthropic",
    model: bridge.resolvedModel,
    stream: false, // Non-streaming JSON response; SSE handled separately
  });

  // response is AIResponse when stream: false
  const aiResponse = response as {
    content: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    cost?: number;
    model: string;
  };

  const promptTokens = aiResponse.usage?.promptTokens ?? 0;
  const completionTokens = aiResponse.usage?.completionTokens ?? 0;

  const { costUSD } = calculateModelCost(
    bridge.resolvedModel,
    promptTokens,
    completionTokens
  );

  return {
    content: aiResponse.content,
    usage: { promptTokens, completionTokens },
    cost: aiResponse.cost ?? costUSD,
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
