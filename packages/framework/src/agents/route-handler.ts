import type { AgentDefinition } from "./define-agent";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";
import type { MemoryStore } from "./memory/types";
import type { Guardrail } from "./guardrails";
import type { ToolExecutorHooks } from "./tool-executor";
import type { LLMCallResult } from "./llm-caller";
import { checkBudget, type BudgetContext } from "./budget-guard";
import { createAuthGuard } from "../middleware/auth-guard";
import { checkDelegationDepth } from "./orchestration/agent-tool";
import { buildLongTermMemoryTools, type LongTermConfig } from "./long-term-memory-tools";
import { validateMessages } from "./route-handler-validation";
import { MAX_REQUEST_BYTES } from "./route-handler-validation";
import { deriveUserIdFromBearer, resolveThread, buildWorkingMemoryPrefix } from "./route-handler-memory";
import { compressThread } from "./memory/compress";
import { jsonResponse, handleWithTools, handleNoTools } from "./route-handler-loop";

export { validateMessages } from "./route-handler-validation";

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
    agent: string; model: string; tokens: number; cost: number;
    durationMs?: number;
    inputMessages?: Array<{ role: string; content: string | unknown[] }>;
    outputText?: string;
  }) => void;
  onToolCall?: (record: {
    agent: string; tool: string; durationMs: number; iteration: number;
  }) => void;
  onError?: (record: {
    agent: string; error: string; timestamp: number;
  }) => void;
  inputGuardrails?: Guardrail[];
  outputGuardrails?: Guardrail[];
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
    const budgetContext: BudgetContext = {};
    const budgetError = checkBudget(agentName, sessionId, options.budget, budgetContext);
    if (budgetError) return jsonResponse({ error: budgetError }, 429);

    let threadId = typeof body.threadId === "string" ? body.threadId.slice(0, 128) : undefined;
    let historyMessages: IncomingMessage[] = [];

    if (options.memoryStore && options.memory) {
      const result = await resolveThread(options.memoryStore, options.memory, agentName, threadId, requestUserId, compressThread);
      if (result instanceof Response) return result;
      threadId = result.threadId;
      historyMessages = result.historyMessages;
    }

    const sanitized = body.messages.map(({ role, content }) => ({ role, content }));
    const allMessages = [...historyMessages, ...sanitized];

    let workingMemoryPrefix: { role: string; content: string } | undefined;
    const memoryConfig = typeof options.memory === "object" ? options.memory : undefined;
    if (memoryConfig?.workingMemory && options.memoryStore && threadId) {
      workingMemoryPrefix = await buildWorkingMemoryPrefix(options.memoryStore, threadId, memoryConfig.workingMemory);
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
