import type { AgentDefinition } from "./define-agent";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";
import type { MemoryStore } from "./memory/types";
import type { Guardrail } from "./guardrails";
import type { ToolExecutorHooks } from "./tool-executor";
import { createLLMBridge } from "./llm-bridge";
import { callWithFallback, type LLMCallResult } from "./llm-caller";
import { checkBudget, recordCost, type BudgetContext } from "./budget-guard";
import { createAuthGuard } from "../middleware/auth-guard";
import { buildSecurityHeaders } from "../middleware/security";
import { createSSEResponse, type SSEEvent } from "./sse-stream";
import { createToolExecutor } from "./tool-executor";
import { runAgentLoop, type AgentLoopEvent } from "./agent-loop";
import { checkDelegationDepth } from "./orchestration/agent-tool";
import { getAgentApprovals, createApprovalHandler } from "./approval-handler";
import { compressThread } from "./memory/compress";

const approvalHandler = createApprovalHandler();

/** Serialize message content for memory storage — always produces a string */
function serializeContentForMemory(content: string | unknown[]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

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
    messages: Array<{ role: string; content: string | unknown[] }>
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
    durationMs?: number;
    inputMessages?: Array<{ role: string; content: string | unknown[] }>;
    outputText?: string;
  }) => void;
  onToolCall?: (record: {
    agent: string;
    tool: string;
    durationMs: number;
    iteration: number;
  }) => void;
  onError?: (record: {
    agent: string;
    error: string;
    timestamp: number;
  }) => void;
  inputGuardrails?: Guardrail[];
  outputGuardrails?: Guardrail[];
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
    case "approval-required":
      return { type: "approval-required", toolName: event.toolName, input: event.input, approvalId: event.approvalId, iteration: event.iteration };
    case "handoff":
      return { type: "handoff", targetAgent: event.targetAgent, input: event.input, iteration: event.iteration };
  }
}

async function resolveGenerateFn(bridge: { provider: string; resolvedModel: string }) {
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

async function resolveStreamFn(bridge: { provider: string; resolvedModel: string }) {
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

    const depthError = checkDelegationDepth(req);
    if (depthError) {
      return jsonResponse({ error: depthError }, 429);
    }

    type IncomingMessage = { role: string; content: string | unknown[] };
    let body: { messages?: IncomingMessage[]; sessionId?: string; threadId?: string };
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
    const MAX_PARTS = 20;
    const MAX_BASE64_BYTES = 2 * 1024 * 1024; // 2 MB
    for (const msg of body.messages) {
      if (typeof msg.role !== "string") {
        return jsonResponse({ error: "Each message must have a role string" }, 400);
      }
      if (!ALLOWED_ROLES.has(msg.role)) {
        return jsonResponse({ error: `Invalid role: ${msg.role}` }, 400);
      }
      if (typeof msg.content === "string") {
        if (msg.content.length > 100_000) {
          return jsonResponse({ error: "Message content too large" }, 400);
        }
      } else if (Array.isArray(msg.content)) {
        if (msg.content.length > MAX_PARTS) {
          return jsonResponse({ error: `Message content array exceeds max parts (${MAX_PARTS})` }, 400);
        }
        for (const part of msg.content) {
          if (typeof part !== "object" || part === null || typeof (part as Record<string, unknown>).type !== "string") {
            return jsonResponse({ error: "Each content part must have a type field" }, 400);
          }
          const p = part as Record<string, unknown>;
          if (typeof p.base64 === "string" && p.base64.length > MAX_BASE64_BYTES) {
            return jsonResponse({ error: "base64 image content exceeds 2MB limit" }, 400);
          }
        }
      } else {
        return jsonResponse({ error: "Each message must have content as a string or array of parts" }, 400);
      }
    }

    const sessionId = typeof body.sessionId === "string"
      ? body.sessionId.slice(0, 128)
      : "default";

    // Per-user and per-tenant budgets are scoped by request headers (set by auth middleware)
    const budgetContext: BudgetContext = {
      userId: req.headers.get("x-user-id")?.slice(0, 128) || undefined,
      tenantId: req.headers.get("x-tenant-id")?.slice(0, 128) || undefined,
    };

    const budgetError = checkBudget(agentName, sessionId, options.budget, budgetContext);
    if (budgetError) {
      return jsonResponse({ error: budgetError }, 429);
    }

    // Memory: load thread history if threadId provided
    let threadId = typeof body.threadId === "string" ? body.threadId.slice(0, 128) : undefined;
    let historyMessages: Array<{ role: string; content: string | unknown[] }> = [];

    if (options.memoryStore && options.memory) {
      if (threadId) {
        const thread = await options.memoryStore.getThread(threadId);
        if (!thread || thread.agentName !== agentName) {
          return jsonResponse({ error: "Thread not found or does not belong to this agent" }, 404);
        }

        // Compression: run before loading history so the compressed version is used
        const memoryConfig = typeof options.memory === "object" ? options.memory : undefined;
        if (memoryConfig?.compression?.enabled && options.memoryStore) {
          await compressThread(threadId, options.memoryStore, {
            triggerAt: memoryConfig.compression.triggerAt,
            keepRecent: memoryConfig.compression.keepRecent,
            summarize: memoryConfig.compression.summarize,
          });
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

    // Working memory: prepend computed context as a system message before systemPrompt
    let workingMemoryPrefix: { role: string; content: string } | undefined;
    const memoryConfig = typeof options.memory === "object" ? options.memory : undefined;
    if (memoryConfig?.workingMemory && options.memoryStore && threadId) {
      const { buildWorkingMemory } = await import("../agents/memory/working-memory.js");
      const threadMessages = await options.memoryStore.getMessages(threadId);
      const wmContent = buildWorkingMemory(threadMessages, memoryConfig.workingMemory);
      if (wmContent.trim()) {
        workingMemoryPrefix = { role: "system", content: wmContent };
      }
    }

    const baseMessages = workingMemoryPrefix
      ? [workingMemoryPrefix, ...allMessages]
      : allMessages;
    const messages = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...baseMessages]
      : baseMessages;

    const requestStartMs = Date.now();

    try {
      // Agent loop path — when tools are available
      if (hasTools) {
        // onApprovalRequired: stores resolve in pendingApprovals, suspends until POST /approve
        const onApprovalRequired: ToolExecutorHooks["onApprovalRequired"] = (
          toolName,
          _input,
          approvalId
        ) => {
          return new Promise<{ approved: boolean; modifiedInput?: Record<string, unknown> }>((resolve) => {
            getAgentApprovals(agentName).set(approvalId, { resolve, toolName });
          });
        };

        const mergedHooks: ToolExecutorHooks = {
          ...options.toolHooks,
          onApprovalRequired,
        };

        const toolExecutor = createToolExecutor(options.toolDefinitions as ToolDefinition[], mergedHooks);
        const toolSchemas = toolExecutor.toLLMSchema();

        const getGenerateWithTools = async () => {
          if (options._generateWithTools) return options._generateWithTools;
          const bridge = createLLMBridge({ model: options.model });
          return resolveGenerateFn(bridge);
        };

        const getStreamWithTools = async () => {
          if (options._streamWithTools) return options._streamWithTools;
          const bridge = createLLMBridge({ model: options.model });
          return resolveStreamFn(bridge);
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
          content: m.content as LLMMessage["content"],
        }));

        const loopGen = runAgentLoop({
          messages: llmMessages,
          toolExecutor,
          toolSchemas,
          agentName,
          sessionId,
          model: options.model,
          budget: options.budget,
          budgetContext,
          maxIterations: options.maxIterations,
          stream: options.stream ?? false,
          generationOptions: options.generationOptions,
          generateWithTools: generateFn,
          streamWithTools: streamFn,
          calculateCost,
          inputGuardrails: options.inputGuardrails,
          outputGuardrails: options.outputGuardrails,
          handoffs: options.handoffs,
        });

        if (options.stream) {
          return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
            let totalTokens = 0;
            let totalCost = 0;
            let streamContent = "";

            for await (const event of loopGen) {
              if (event.type === "usage") {
                totalTokens += event.promptTokens + event.completionTokens;
                totalCost += event.cost;
              }
              if (event.type === "text") {
                streamContent = event.content;
              }
              if (event.type === "tool-result") {
                options.onToolCall?.({
                  agent: agentName,
                  tool: event.name,
                  durationMs: event.durationMs,
                  iteration: event.iteration,
                });
              }
              if (event.type === "error") {
                options.onError?.({
                  agent: agentName,
                  error: event.message,
                  timestamp: Date.now(),
                });
              }
              const sseEvent = agentLoopEventToSSE(event);
              if (sseEvent) yield sseEvent;
            }

            options.onCallComplete?.({
              agent: agentName,
              model: options.model,
              tokens: totalTokens,
              cost: totalCost,
              durationMs: Date.now() - requestStartMs,
              inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
              outputText: streamContent || undefined,
            });

            // Persist to memory after stream completes
            if (options.memoryStore && threadId) {
              const lastUserMsg = sanitized[sanitized.length - 1];
              if (lastUserMsg) {
                await options.memoryStore.appendMessage(threadId, {
                  threadId,
                  role: "user",
                  content: serializeContentForMemory(lastUserMsg.content),
                });
              }
              if (streamContent) {
                await options.memoryStore.appendMessage(threadId, {
                  threadId,
                  role: "assistant",
                  content: streamContent,
                });
              }
            }
          });
        }

        // Batch mode — collect events
        let content = "";
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalCost = 0;
        const toolCalls: Array<{ name: string; input: Record<string, unknown>; output: string }> = [];
        let currentToolCall: { name: string; input: Record<string, unknown> } | null = null;

        for await (const event of loopGen) {
          if (event.type === "text") content = event.content;
          else if (event.type === "usage") {
            totalPromptTokens += event.promptTokens;
            totalCompletionTokens += event.completionTokens;
            totalCost += event.cost;
          } else if (event.type === "tool-call") {
            currentToolCall = { name: event.name, input: event.input };
          } else if (event.type === "tool-result") {
            if (currentToolCall) {
              toolCalls.push({ ...currentToolCall, output: event.output });
              currentToolCall = null;
            }
            options.onToolCall?.({
              agent: agentName,
              tool: event.name,
              durationMs: event.durationMs,
              iteration: event.iteration,
            });
          } else if (event.type === "error") {
            options.onError?.({
              agent: agentName,
              error: event.message,
              timestamp: Date.now(),
            });
          }
        }

        options.onCallComplete?.({
          agent: agentName,
          model: options.model,
          tokens: totalPromptTokens + totalCompletionTokens,
          cost: totalCost,
          durationMs: Date.now() - requestStartMs,
          inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
          outputText: content || undefined,
        });

        // Persist to memory
        if (options.memoryStore && threadId) {
          const lastUserMsg = sanitized[sanitized.length - 1];
          if (lastUserMsg) {
            await options.memoryStore.appendMessage(threadId, {
              threadId,
              role: "user",
              content: serializeContentForMemory(lastUserMsg.content),
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
          usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
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
          recordCost(agentName, sessionId, result.cost, budgetContext);

          options.onCallComplete?.({
            agent: agentName,
            model: options.model,
            tokens: totalTokens,
            cost: result.cost,
            durationMs: Date.now() - requestStartMs,
            inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
            outputText: result.content || undefined,
          });

          // Persist to memory after streaming completes
          if (options.memoryStore && threadId) {
            const lastUserMsg = sanitized[sanitized.length - 1];
            if (lastUserMsg) {
              await options.memoryStore.appendMessage(threadId, {
                threadId,
                role: "user",
                content: serializeContentForMemory(lastUserMsg.content),
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
      recordCost(agentName, sessionId, result.cost, budgetContext);

      options.onCallComplete?.({
        agent: agentName,
        model: options.model,
        tokens: totalTokens,
        cost: result.cost,
        durationMs: Date.now() - requestStartMs,
        inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
        outputText: result.content || undefined,
      });

      // Persist to memory
      if (options.memoryStore && threadId) {
        const lastUserMsg = sanitized[sanitized.length - 1];
        if (lastUserMsg) {
          await options.memoryStore.appendMessage(threadId, {
            threadId,
            role: "user",
            content: serializeContentForMemory(lastUserMsg.content),
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
