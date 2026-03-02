import type { AgentDefinition } from "./define-agent";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";
import type { MemoryStore } from "./memory/types";
import { createLLMBridge } from "./llm-bridge";
import { callWithFallback, type LLMCallResult } from "./llm-caller";
import { checkBudget, recordCost } from "./budget-guard";
import { createAuthGuard } from "../middleware/auth-guard";
import { buildSecurityHeaders } from "../middleware/security";
import { createSSEResponse, type SSEEvent } from "./sse-stream";
import { createToolExecutor } from "./tool-executor";
import { runAgentLoop, type AgentLoopEvent } from "./agent-loop";

export interface AgentHandlerOptions
  extends Omit<AgentDefinition, "budget" | "fallback" | "systemPrompt" | "tools" | "stream"> {
  systemPrompt?: string;
  budget?: AgentDefinition["budget"];
  fallback?: string[];
  tools?: string[];
  stream?: boolean;
  toolDefinitions?: ToolDefinition[];
  maxIterations?: number;
  memoryStore?: MemoryStore;
  _llmCall?: (
    messages: Array<{ role: string; content: string }>
  ) => Promise<LLMCallResult>;
  _generateWithTools?: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => Promise<LLMToolResult>;
  _streamWithTools?: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => AsyncGenerator<LLMStreamEvent>;
  _calculateCost?: (model: string, promptTokens: number, completionTokens: number) => { costUSD: number };
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

function agentLoopEventToSSE(event: AgentLoopEvent): SSEEvent | null {
  switch (event.type) {
    case "text-delta":
      return { type: "text-delta", content: event.content };
    case "text":
      return { type: "text", content: event.content };
    case "tool-call":
      return { type: "tool-call", name: event.name, input: event.input, iteration: event.iteration };
    case "tool-result":
      return { type: "tool-result", name: event.name, output: event.output, durationMs: event.durationMs, iteration: event.iteration };
    case "usage":
      return { type: "usage", promptTokens: event.promptTokens, completionTokens: event.completionTokens, cost: event.cost };
    case "done":
      return { type: "done" };
    case "error":
      return { type: "error", message: event.message };
  }
}

export function createAgentHandler(options: AgentHandlerOptions) {
  const authGuard = createAuthGuard(options.auth);
  const agentName = options.model.split("/").pop() || "agent";
  const hasTools = (options.toolDefinitions?.length ?? 0) > 0;

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authResult = await authGuard(req);
    if (authResult) return authResult;

    let body: { messages?: Array<{ role: string; content: string }>; sessionId?: string; threadId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    if (body.messages.length > 200) {
      return jsonResponse({ error: "Too many messages (max 200)" }, 400);
    }

    const ALLOWED_ROLES = new Set(["user", "assistant"]);
    for (const msg of body.messages) {
      if (typeof msg.role !== "string" || typeof msg.content !== "string") {
        return jsonResponse({ error: "Each message must have role and content strings" }, 400);
      }
      if (!ALLOWED_ROLES.has(msg.role)) {
        return jsonResponse({ error: `Invalid role: ${msg.role}` }, 400);
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

    // Memory: load thread history if threadId provided
    let threadId = typeof body.threadId === "string" ? body.threadId.slice(0, 128) : undefined;
    let historyMessages: Array<{ role: string; content: string }> = [];

    if (options.memoryStore && options.memory) {
      if (threadId) {
        const thread = await options.memoryStore.getThread(threadId);
        if (!thread || thread.agentName !== agentName) {
          return jsonResponse({ error: "Thread not found or does not belong to this agent" }, 404);
        }
        const maxMsgs = typeof options.memory === "object" ? options.memory.maxMessages ?? 50 : 50;
        const history = await options.memoryStore.getMessages(threadId, { limit: maxMsgs });
        historyMessages = history.map((m) => ({
          role: m.role === "tool-call" || m.role === "tool-result" ? "assistant" : m.role,
          content: m.content,
        }));
      } else {
        const thread = await options.memoryStore.createThread(agentName);
        threadId = thread.id;
      }
    }

    const sanitized = body.messages.map(({ role, content }) => ({ role, content }));
    const allMessages = [...historyMessages, ...sanitized];
    const messages = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...allMessages]
      : allMessages;

    try {
      // Agent loop path — when tools are available
      if (hasTools) {
        const toolExecutor = createToolExecutor(options.toolDefinitions as ToolDefinition[]);
        const toolSchemas = toolExecutor.toLLMSchema();

        const getGenerateWithTools = async () => {
          if (options._generateWithTools) return options._generateWithTools;
          const bridge = createLLMBridge({ model: options.model });
          if (bridge.provider === "anthropic") {
            const { anthropicGenerateWithTools } = await import("@fabrk/ai");
            return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
              anthropicGenerateWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
          }
          const { openaiGenerateWithTools } = await import("@fabrk/ai");
          return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
            openaiGenerateWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
        };

        const getStreamWithTools = async () => {
          if (options._streamWithTools) return options._streamWithTools;
          const bridge = createLLMBridge({ model: options.model });
          if (bridge.provider === "anthropic") {
            const { anthropicStreamWithTools } = await import("@fabrk/ai");
            return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
              anthropicStreamWithTools(msgs, tools, { anthropicModel: bridge.resolvedModel });
          }
          const { openaiStreamWithTools } = await import("@fabrk/ai");
          return (msgs: LLMMessage[], tools: LLMToolSchema[]) =>
            openaiStreamWithTools(msgs, tools, { openaiModel: bridge.resolvedModel });
        };

        const getCalculateCost = async () => {
          if (options._calculateCost) return options._calculateCost;
          const { calculateModelCost } = await import("@fabrk/ai");
          return calculateModelCost;
        };

        const [generateFn, streamFn, calculateCost] = await Promise.all([
          getGenerateWithTools(),
          options.stream ? getStreamWithTools() : Promise.resolve(undefined),
          getCalculateCost(),
        ]);

        const llmMessages: LLMMessage[] = messages.map((m) => ({
          role: m.role as LLMMessage["role"],
          content: m.content,
        }));

        const loopGen = runAgentLoop({
          messages: llmMessages,
          toolExecutor,
          toolSchemas,
          agentName,
          sessionId,
          model: options.model,
          budget: options.budget,
          maxIterations: options.maxIterations,
          stream: options.stream ?? false,
          generateWithTools: generateFn,
          streamWithTools: streamFn,
          calculateCost,
        });

        if (options.stream) {
          return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
            let totalTokens = 0;
            let totalCost = 0;

            for await (const event of loopGen) {
              if (event.type === "usage") {
                totalTokens += event.promptTokens + event.completionTokens;
                totalCost += event.cost;
              }
              const sseEvent = agentLoopEventToSSE(event);
              if (sseEvent) yield sseEvent;
            }

            options.onCallComplete?.({
              agent: agentName,
              model: options.model,
              tokens: totalTokens,
              cost: totalCost,
            });
          });
        }

        // Batch mode — collect events
        let content = "";
        let totalTokens = 0;
        let totalCost = 0;
        const toolCalls: Array<{ name: string; input: Record<string, unknown>; output: string }> = [];
        let currentToolCall: { name: string; input: Record<string, unknown> } | null = null;

        for await (const event of loopGen) {
          if (event.type === "text") content = event.content;
          else if (event.type === "usage") {
            totalTokens += event.promptTokens + event.completionTokens;
            totalCost += event.cost;
          } else if (event.type === "tool-call") {
            currentToolCall = { name: event.name, input: event.input };
          } else if (event.type === "tool-result" && currentToolCall) {
            toolCalls.push({ ...currentToolCall, output: event.output });
            currentToolCall = null;
          }
        }

        options.onCallComplete?.({
          agent: agentName,
          model: options.model,
          tokens: totalTokens,
          cost: totalCost,
        });

        // Persist to memory
        if (options.memoryStore && threadId) {
          const lastUserMsg = sanitized[sanitized.length - 1];
          if (lastUserMsg) {
            await options.memoryStore.appendMessage(threadId, {
              threadId,
              role: "user",
              content: lastUserMsg.content,
            });
          }
          if (content) {
            await options.memoryStore.appendMessage(threadId, {
              threadId,
              role: "assistant",
              content,
            });
          }
        }

        return jsonResponse({
          content,
          usage: { promptTokens: Math.floor(totalTokens / 2), completionTokens: Math.ceil(totalTokens / 2) },
          cost: totalCost,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          threadId,
        }, 200);
      }

      // Simple path — no tools
      if (options.stream) {
        return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
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

          yield { type: "text", content: result.content };
          yield {
            type: "usage",
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            cost: result.cost,
          };
          yield { type: "done" };
        });
      }

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

      // Persist to memory
      if (options.memoryStore && threadId) {
        const lastUserMsg = sanitized[sanitized.length - 1];
        if (lastUserMsg) {
          await options.memoryStore.appendMessage(threadId, {
            threadId,
            role: "user",
            content: lastUserMsg.content,
          });
        }
        if (result.content) {
          await options.memoryStore.appendMessage(threadId, {
            threadId,
            role: "assistant",
            content: result.content,
          });
        }
      }

      return jsonResponse({ ...result, threadId }, 200);
    } catch (err) {
      console.error("[fabrk] Agent handler error:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  };
}
