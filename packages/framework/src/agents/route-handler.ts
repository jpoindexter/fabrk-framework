import type { AgentDefinition } from "./define-agent.js";
import { createLLMBridge } from "./llm-bridge.js";
import { callWithFallback, type LLMCallResult } from "./llm-caller.js";
import { checkBudget, recordCost } from "./budget-guard.js";
import { createAuthGuard } from "../middleware/auth-guard.js";
import { buildSecurityHeaders } from "../middleware/security.js";

export interface AgentHandlerOptions
  extends Omit<AgentDefinition, "budget" | "fallback" | "systemPrompt" | "stream" | "tools"> {
  systemPrompt?: string;
  budget?: AgentDefinition["budget"];
  fallback?: string[];
  _llmCall?: (
    messages: Array<{ role: string; content: string }>
  ) => Promise<LLMCallResult>;
  onCallComplete?: (record: {
    agent: string;
    model: string;
    tokens: number;
    cost: number;
  }) => void;
}

function jsonResponse(data: unknown, status: number): Response {
  const headers = {
    "Content-Type": "application/json",
    ...buildSecurityHeaders(),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

export function createAgentHandler(options: AgentHandlerOptions) {
  const authGuard = createAuthGuard(options.auth);
  const agentName = options.model.split("/").pop() || "agent";

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authResult = await authGuard(req);
    if (authResult) return authResult;

    let body: { messages?: Array<{ role: string; content: string }>; sessionId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    for (const msg of body.messages) {
      if (typeof msg.role !== "string" || typeof msg.content !== "string") {
        return jsonResponse({ error: "Each message must have role and content strings" }, 400);
      }
      if (msg.content.length > 100_000) {
        return jsonResponse({ error: "Message content too large" }, 400);
      }
    }

    const sessionId = typeof body.sessionId === "string"
      ? body.sessionId.slice(0, 128)
      : "default";
    const budgetError = checkBudget(agentName, sessionId, options.budget);
    if (budgetError) {
      return jsonResponse({ error: budgetError }, 429);
    }

    const messages = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...body.messages]
      : body.messages;

    try {
      let result: LLMCallResult;

      if (options._llmCall) {
        result = await options._llmCall(messages);
      } else {
        const primary = createLLMBridge({ model: options.model });
        const fallbacks = (options.fallback ?? []).map((m) =>
          createLLMBridge({ model: m })
        );
        result = await callWithFallback(primary, fallbacks, messages);
      }

      const totalTokens = result.usage.promptTokens + result.usage.completionTokens;
      recordCost(agentName, sessionId, result.cost);

      options.onCallComplete?.({
        agent: agentName,
        model: options.model,
        tokens: totalTokens,
        cost: result.cost,
      });

      return jsonResponse(result, 200);
    } catch (err) {
      console.error("[fabrk] Agent handler error:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  };
}
