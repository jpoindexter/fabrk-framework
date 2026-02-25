import type { AgentDefinition } from "./define-agent.js";

interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
}

export interface AgentHandlerOptions
  extends Omit<AgentDefinition, "budget" | "fallback" | "systemPrompt"> {
  systemPrompt?: string;
  budget?: AgentDefinition["budget"];
  fallback?: string[];
  /** Internal: override LLM call for testing */
  _llmCall?: (
    messages: Array<{ role: string; content: string }>
  ) => Promise<LLMCallResult>;
}

/**
 * Create a Web-standard Request handler for an agent route.
 * Returns: (Request) => Promise<Response>
 */
export function createAgentHandler(options: AgentHandlerOptions) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: { messages?: Array<{ role: string; content: string }> };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      !body.messages ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const messages = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...body.messages]
      : body.messages;

    try {
      if (options._llmCall) {
        const result = await options._llmCall(messages);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // TODO: Wire real LLM call via @fabrk/ai in Task 8
      return new Response(
        JSON.stringify({ error: "LLM not configured" }),
        {
          status: 501,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Agent error", message: String(err) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}
