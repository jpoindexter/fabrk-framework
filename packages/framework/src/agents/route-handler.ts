import type { AgentDefinition } from "./define-agent";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";
import type { MemoryStore } from "./memory/types";
import type { Guardrail } from "./guardrails";
import type { ToolExecutorHooks } from "./tool-executor";
import { createLLMBridge } from "./llm-bridge";
import { callWithFallback, resolveToolGenerateFn, resolveToolStreamFn, type LLMCallResult } from "./llm-caller";
import { checkBudget, recordCost, type BudgetContext } from "./budget-guard";
import { createAuthGuard } from "../middleware/auth-guard";
import { buildSecurityHeaders } from "../middleware/security";
import { createSSEResponse, type SSEEvent } from "./sse-stream";
import { createToolExecutor } from "./tool-executor";
import { runAgentLoop, type AgentLoopEvent } from "./agent-loop";
import { checkDelegationDepth } from "./orchestration/agent-tool";
import { waitForApproval } from "./approval-handler";
import { compressThread } from "./memory/compress";
import { persistMessages } from "./memory-helpers";
import { buildLongTermMemoryTools, type LongTermConfig } from "./long-term-memory-tools";

const ALLOWED_ROLES = new Set(["user", "assistant"]);
const MAX_PARTS = 20;
const MAX_BASE64_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

function validateMessages(
  messages: Array<{ role: unknown; content: unknown }>
): string | null {
  if (messages.length > 200) return "Too many messages (max 200)";

  for (const msg of messages) {
    if (typeof msg.role !== "string") return "Each message must have a role string";
    if (!ALLOWED_ROLES.has(msg.role)) return `Invalid role: ${msg.role}`;

    if (typeof msg.content === "string") {
      if (msg.content.length > 100_000) return "Message content too large";
    } else if (Array.isArray(msg.content)) {
      if (msg.content.length > MAX_PARTS) {
        return `Message content array exceeds max parts (${MAX_PARTS})`;
      }
      for (const part of msg.content) {
        if (typeof part !== "object" || part === null || typeof (part as Record<string, unknown>).type !== "string") {
          return "Each content part must have a type field";
        }
        const p = part as Record<string, unknown>;
        if (typeof p.base64 === "string" && p.base64.length > MAX_BASE64_BYTES) {
          return "base64 image content exceeds 2MB limit";
        }
      }
    } else {
      return "Each message must have content as a string or array of parts";
    }
  }

  return null;
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

function agentLoopEventToSSE(event: AgentLoopEvent): SSEEvent | null {
  switch (event.type) {
    case "text-delta": return { type: "text-delta", content: event.content };
    case "text": return { type: "text", content: event.content };
    case "tool-call": return { type: "tool-call", name: event.name, input: event.input, iteration: event.iteration };
    case "tool-result": return { type: "tool-result", name: event.name, output: event.output, durationMs: event.durationMs, iteration: event.iteration };
    case "usage": return { type: "usage", promptTokens: event.promptTokens, completionTokens: event.completionTokens, cost: event.cost };
    case "done": return { type: "done" };
    case "error": return { type: "error", message: event.message };
    case "approval-required": return { type: "approval-required", toolName: event.toolName, input: event.input, approvalId: event.approvalId, iteration: event.iteration };
    case "handoff": return { type: "handoff", targetAgent: event.targetAgent, input: event.input, iteration: event.iteration };
    case "structured-output": return { type: "structured-output", data: event.data, iteration: event.iteration };
  }
}

async function deriveUserIdFromBearer(authHeader: string | null): Promise<string | undefined> {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  if (!token) return undefined;
  const encoded = new TextEncoder().encode(token);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function createAgentHandler(options: AgentHandlerOptions) {
  const authGuard = createAuthGuard(options.auth);
  const agentName = options.model.split("/").pop() || "agent";

  const longTermConfig = typeof options.memory === "object" ? options.memory?.longTerm : undefined;
  const longTermTools = longTermConfig ? buildLongTermMemoryTools(longTermConfig as LongTermConfig, agentName) : [];
  const resolvedToolDefinitions = [...(options.toolDefinitions ?? []), ...longTermTools];
  const hasTools = resolvedToolDefinitions.length > 0;

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const authResult = await authGuard(req);
    if (authResult) return authResult;

    // Derive a stable, opaque userId from the Bearer token so threads are bound
    // to the caller's credential. SHA-256 avoids storing raw tokens in memory.
    const requestUserId = await deriveUserIdFromBearer(req.headers.get("Authorization"));

    const depthError = checkDelegationDepth(req);
    if (depthError) return jsonResponse({ error: depthError }, 429);

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
      return jsonResponse({ error: "Request body too large" }, 413);
    }

    type IncomingMessage = { role: string; content: string | unknown[] };
    let body: { messages?: IncomingMessage[]; sessionId?: string; threadId?: string };
    try {
      const text = await req.text();
      if (text.length > MAX_REQUEST_BYTES) return jsonResponse({ error: "Request body too large" }, 413);
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    const validationError = validateMessages(body.messages);
    if (validationError) return jsonResponse({ error: validationError }, 400);

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 128) : "default";

    // Per-user and per-tenant budgets must come from authenticated middleware context,
    // not raw request headers — any caller could otherwise spoof budget bucket keys.
    const budgetContext: BudgetContext = {};
    const budgetError = checkBudget(agentName, sessionId, options.budget, budgetContext);
    if (budgetError) return jsonResponse({ error: budgetError }, 429);

    let threadId = typeof body.threadId === "string" ? body.threadId.slice(0, 128) : undefined;
    let historyMessages: Array<{ role: string; content: string | unknown[] }> = [];

    if (options.memoryStore && options.memory) {
      if (threadId) {
        const thread = await options.memoryStore.getThread(threadId);
        if (!thread || thread.agentName !== agentName) {
          return jsonResponse({ error: "Thread not found or does not belong to this agent" }, 404);
        }
        // Enforce per-user thread isolation: if the thread was created with a userId,
        // the caller must present the same credential. Prevents cross-user memory leakage.
        if (thread.userId !== undefined && thread.userId !== requestUserId) {
          return jsonResponse({ error: "Thread not found or does not belong to this agent" }, 404);
        }

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
        const thread = await options.memoryStore.createThread(agentName, requestUserId);
        threadId = thread.id;
      }
    }

    const sanitized = body.messages.map(({ role, content }) => ({ role, content }));
    const allMessages = [...historyMessages, ...sanitized];

    let workingMemoryPrefix: { role: string; content: string } | undefined;
    const memoryConfig = typeof options.memory === "object" ? options.memory : undefined;
    if (memoryConfig?.workingMemory && options.memoryStore && threadId) {
      const { buildWorkingMemory } = await import("../agents/memory/working-memory.js");
      const threadMessages = await options.memoryStore.getMessages(threadId);
      const wmContent = buildWorkingMemory(threadMessages, memoryConfig.workingMemory);
      if (wmContent.trim()) {
        // Sanitize working memory before injecting into the system role.
        // Stored messages contain user-supplied text; without sanitization a
        // user can craft a message like "IGNORE ALL PREVIOUS INSTRUCTIONS" that
        // lands verbatim in the system prompt (prompt injection via memory).
        // Strip ASCII control chars (except tab/LF/CR), cap at 8 KB, and wrap
        // in explicit delimiters so the LLM can distinguish framework context.
        // eslint-disable-next-line no-control-regex -- intentional: stripping control chars from stored memory
        const wmSanitized = wmContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 8_192);
        workingMemoryPrefix = {
          role: "system",
          content: `<working_memory>\n${wmSanitized}\n</working_memory>`,
        };
      }
    }

    const baseMessages = workingMemoryPrefix ? [workingMemoryPrefix, ...allMessages] : allMessages;
    const messages = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...baseMessages]
      : baseMessages;

    const requestStartMs = Date.now();

    try {
      if (hasTools) {
        return await handleWithTools(options, {
          agentName, sessionId, threadId, sanitized, messages, budgetContext,
          resolvedToolDefinitions, requestStartMs,
        });
      }
      return await handleNoTools(options, {
        agentName, sessionId, threadId, sanitized, messages, budgetContext, requestStartMs,
      });
    } catch (err) {
      console.error("[fabrk] Agent handler error:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  };
}

interface LoopContext {
  agentName: string;
  sessionId: string;
  threadId?: string;
  sanitized: Array<{ role: string; content: string | unknown[] }>;
  messages: Array<{ role: string; content: string | unknown[] }>;
  budgetContext: BudgetContext;
  requestStartMs: number;
}

interface ToolLoopContext extends LoopContext {
  resolvedToolDefinitions: ToolDefinition[];
}

async function handleWithTools(options: AgentHandlerOptions, ctx: ToolLoopContext): Promise<Response> {
  const { agentName, sessionId, threadId, sanitized, messages, budgetContext, resolvedToolDefinitions, requestStartMs } = ctx;

  const onApprovalRequired: ToolExecutorHooks["onApprovalRequired"] = (toolName, _input, approvalId) =>
    waitForApproval(agentName, approvalId, toolName);

  const mergedHooks: ToolExecutorHooks = { ...options.toolHooks, onApprovalRequired };
  const toolExecutor = createToolExecutor(resolvedToolDefinitions as ToolDefinition[], mergedHooks);
  const toolSchemas = toolExecutor.toLLMSchema();

  const getGenerateWithTools = async () => {
    if (options._generateWithTools) return options._generateWithTools;
    return resolveToolGenerateFn(createLLMBridge({ model: options.model }));
  };

  const getStreamWithTools = async () => {
    if (options._streamWithTools) return options._streamWithTools;
    return resolveToolStreamFn(createLLMBridge({ model: options.model }));
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
    messages: llmMessages, toolExecutor, toolSchemas, agentName, sessionId,
    model: options.model, budget: options.budget, budgetContext,
    maxIterations: options.maxIterations, stream: options.stream ?? false,
    generationOptions: options.generationOptions, generateWithTools: generateFn,
    streamWithTools: streamFn, calculateCost,
    inputGuardrails: options.inputGuardrails, outputGuardrails: options.outputGuardrails,
    handoffs: options.handoffs, outputSchema: options.outputSchema,
  });

  if (options.stream) {
    return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
      let totalTokens = 0;
      let totalCost = 0;
      let streamContent = "";

      for await (const event of loopGen) {
        if (event.type === "usage") { totalTokens += event.promptTokens + event.completionTokens; totalCost += event.cost; }
        if (event.type === "text") streamContent = event.content;
        if (event.type === "tool-result") {
          options.onToolCall?.({ agent: agentName, tool: event.name, durationMs: event.durationMs, iteration: event.iteration });
        }
        if (event.type === "error") options.onError?.({ agent: agentName, error: event.message, timestamp: Date.now() });
        const sseEvent = agentLoopEventToSSE(event);
        if (sseEvent) yield sseEvent;
      }

      options.onCallComplete?.({
        agent: agentName, model: options.model, tokens: totalTokens, cost: totalCost,
        durationMs: Date.now() - requestStartMs,
        inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
        outputText: streamContent || undefined,
      });

      if (options.memoryStore && threadId) {
        await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], streamContent);
      }
    });
  }

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
      if (currentToolCall) { toolCalls.push({ ...currentToolCall, output: event.output }); currentToolCall = null; }
      options.onToolCall?.({ agent: agentName, tool: event.name, durationMs: event.durationMs, iteration: event.iteration });
    } else if (event.type === "error") {
      options.onError?.({ agent: agentName, error: event.message, timestamp: Date.now() });
    }
  }

  options.onCallComplete?.({
    agent: agentName, model: options.model,
    tokens: totalPromptTokens + totalCompletionTokens,
    cost: totalCost, durationMs: Date.now() - requestStartMs,
    inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
    outputText: content || undefined,
  });

  if (options.memoryStore && threadId) {
    await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], content);
  }

  return jsonResponse({
    content,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
    cost: totalCost,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    threadId,
  }, 200);
}

async function handleNoTools(options: AgentHandlerOptions, ctx: LoopContext): Promise<Response> {
  const { agentName, sessionId, threadId, sanitized, messages, budgetContext, requestStartMs } = ctx;

  const callLLM = async (): Promise<LLMCallResult> => {
    if (options._llmCall) return options._llmCall(messages);
    const primary = createLLMBridge({ model: options.model });
    const fallbacks = (options.fallback ?? []).map((m) => createLLMBridge({ model: m }));
    return callWithFallback(primary, fallbacks, messages);
  };

  if (options.stream) {
    return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
      const result = await callLLM();
      recordCost(agentName, sessionId, result.cost, budgetContext);

      options.onCallComplete?.({
        agent: agentName, model: options.model,
        tokens: result.usage.promptTokens + result.usage.completionTokens,
        cost: result.cost, durationMs: Date.now() - requestStartMs,
        inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
        outputText: result.content || undefined,
      });

      if (options.memoryStore && threadId) {
        await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], result.content);
      }

      yield { type: "text", content: result.content };
      yield { type: "usage", promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens, cost: result.cost };
      yield { type: "done" };
    });
  }

  const result = await callLLM();
  recordCost(agentName, sessionId, result.cost, budgetContext);

  options.onCallComplete?.({
    agent: agentName, model: options.model,
    tokens: result.usage.promptTokens + result.usage.completionTokens,
    cost: result.cost, durationMs: Date.now() - requestStartMs,
    inputMessages: messages.map((m) => ({ role: m.role, content: m.content })),
    outputText: result.content || undefined,
  });

  if (options.memoryStore && threadId) {
    await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], result.content);
  }

  return jsonResponse({ ...result, threadId }, 200);
}
