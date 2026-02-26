import type { AgentDefinition } from "./define-agent.js";
import { createLLMBridge } from "./llm-bridge.js";
import { callWithFallback, type LLMCallResult } from "./llm-caller.js";
import { checkBudget, recordCost } from "./budget-guard.js";
import { createAuthGuard } from "../middleware/auth-guard.js";
import { buildSecurityHeaders } from "../middleware/security.js";

export interface AgentHandlerOptions
  extends Omit<AgentDefinition, "budget" | "fallback" | "systemPrompt"> {
  systemPrompt?: string;
  budget?: AgentDefinition["budget"];
  fallback?: string[];
  /** Override LLM call — for testing or custom providers */
  _llmCall?: (
    messages: Array<{ role: string; content: string }>
  ) => Promise<LLMCallResult>;
  /** Callback after each successful call (e.g., for dashboard recording) */
  onCallComplete?: (record: {
    agent: string;
    model: string;
    tokens: number;
    cost: number;
  }) => void;
}

function jsonResponse(data: unknown, status: number, extra?: HeadersInit): Response {
  const headers = {
    "Content-Type": "application/json",
    ...buildSecurityHeaders(),
    ...(extra ?? {}),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Create a Web-standard Request handler for an agent route.
 */
export function createAgentHandler(options: AgentHandlerOptions) {
  const authGuard = createAuthGuard(options.auth);
  const agentName = options.model.split("/").pop() ?? "agent";

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // Auth check
    const authResult = await authGuard(req);
    if (authResult) return authResult;

    // Parse body
    let body: { messages?: Array<{ role: string; content: string }>; sessionId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    // Budget check
    const sessionId = body.sessionId ?? "default";
    const budgetError = checkBudget(agentName, sessionId, options.budget);
    if (budgetError) {
      return jsonResponse({ error: budgetError }, 429);
    }

    // Prepare messages with system prompt
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
        result = await callWithFallback(primary, fallbacks, messages, options.stream);
      }

      // Record cost for budget tracking
      const totalTokens = result.usage.promptTokens + result.usage.completionTokens;
      recordCost(agentName, sessionId, result.cost);

      // Notify dashboard
      options.onCallComplete?.({
        agent: agentName,
        model: options.model,
        tokens: totalTokens,
        cost: result.cost,
      });

      return jsonResponse(result, 200);
    } catch (err) {
      return jsonResponse({ error: "Agent error", message: String(err) }, 500);
    }
  };
}
