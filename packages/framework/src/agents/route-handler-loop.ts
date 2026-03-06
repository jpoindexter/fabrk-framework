import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage } from "@fabrk/ai";
import type { ToolExecutorHooks } from "./tool-executor";
import type { AgentLoopEvent } from "./agent-loop";
import type { SSEEvent } from "./sse-stream";
import type { AgentHandlerOptions } from "./route-handler";
import type { BudgetContext } from "./budget-guard";
import { recordCost } from "./budget-guard";
import { createLLMBridge } from "./llm-bridge";
import { callWithFallback, resolveToolGenerateFn, resolveToolStreamFn, type LLMCallResult } from "./llm-caller";
import { createSSEResponse } from "./sse-stream";
import { createToolExecutor } from "./tool-executor";
import { runAgentLoop } from "./agent-loop";
import { waitForApproval } from "./approval-handler";
import { persistMessages } from "./memory-helpers";
import { buildSecurityHeaders } from "../middleware/security";

export interface LoopContext {
  agentName: string;
  sessionId: string;
  threadId?: string;
  sanitized: Array<{ role: string; content: string | unknown[] }>;
  messages: Array<{ role: string; content: string | unknown[] }>;
  budgetContext: BudgetContext;
  requestStartMs: number;
}

export interface ToolLoopContext extends LoopContext {
  resolvedToolDefinitions: ToolDefinition[];
}

export function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

export function agentLoopEventToSSE(event: AgentLoopEvent): SSEEvent | null {
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

export async function handleWithTools(options: AgentHandlerOptions, ctx: ToolLoopContext): Promise<Response> {
  const { agentName, messages, resolvedToolDefinitions } = ctx;
  const onApprovalRequired: ToolExecutorHooks["onApprovalRequired"] = (toolName, _input, approvalId) =>
    waitForApproval(agentName, approvalId, toolName);
  const toolExecutor = createToolExecutor(resolvedToolDefinitions as ToolDefinition[], { ...options.toolHooks, onApprovalRequired });
  const toolSchemas = toolExecutor.toLLMSchema();

  const [generateFn, streamFn, calculateCost] = await Promise.all([
    options._generateWithTools ? Promise.resolve(options._generateWithTools) : resolveToolGenerateFn(createLLMBridge({ model: options.model })),
    options.stream ? (options._streamWithTools ? Promise.resolve(options._streamWithTools) : resolveToolStreamFn(createLLMBridge({ model: options.model }))) : Promise.resolve(undefined),
    options._calculateCost ? Promise.resolve(options._calculateCost) : import("@fabrk/ai").then((m) => m.calculateModelCost),
  ]);

  const llmMessages: LLMMessage[] = messages.map((m) => ({ role: m.role as LLMMessage["role"], content: m.content as LLMMessage["content"] }));
  const loopGen = runAgentLoop({
    messages: llmMessages, toolExecutor, toolSchemas, agentName, sessionId: ctx.sessionId,
    model: options.model, budget: options.budget, budgetContext: ctx.budgetContext,
    maxIterations: options.maxIterations, stream: options.stream ?? false,
    generationOptions: options.generationOptions, generateWithTools: generateFn,
    streamWithTools: streamFn, calculateCost,
    inputGuardrails: options.inputGuardrails, outputGuardrails: options.outputGuardrails,
    handoffs: options.handoffs, outputSchema: options.outputSchema,
  });

  return options.stream ? streamLoop(options, loopGen, ctx) : collectLoop(options, loopGen, ctx);
}

async function streamLoop(options: AgentHandlerOptions, loopGen: AsyncGenerator<AgentLoopEvent>, ctx: LoopContext): Promise<Response> {
  const { agentName, threadId, sanitized, messages, requestStartMs } = ctx;
  return createSSEResponse(async function* (): AsyncGenerator<SSEEvent> {
    let totalTokens = 0, totalCost = 0, streamContent = "";
    for await (const event of loopGen) {
      if (event.type === "usage") { totalTokens += event.promptTokens + event.completionTokens; totalCost += event.cost; }
      if (event.type === "text") streamContent = event.content;
      if (event.type === "tool-result") options.onToolCall?.({ agent: agentName, tool: event.name, durationMs: event.durationMs, iteration: event.iteration });
      if (event.type === "error") options.onError?.({ agent: agentName, error: event.message, timestamp: Date.now() });
      const sse = agentLoopEventToSSE(event);
      if (sse) yield sse;
    }
    emitCallComplete(options, ctx, totalTokens, totalCost, streamContent);
    if (options.memoryStore && threadId) await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], streamContent);
  });
}

async function collectLoop(options: AgentHandlerOptions, loopGen: AsyncGenerator<AgentLoopEvent>, ctx: LoopContext & { resolvedToolDefinitions?: ToolDefinition[] }): Promise<Response> {
  const { agentName, threadId, sanitized } = ctx;
  let content = "", promptTok = 0, completionTok = 0, totalCost = 0;
  const toolCalls: Array<{ name: string; input: Record<string, unknown>; output: string }> = [];
  let cur: { name: string; input: Record<string, unknown> } | null = null;
  for await (const event of loopGen) {
    if (event.type === "text") content = event.content;
    else if (event.type === "usage") { promptTok += event.promptTokens; completionTok += event.completionTokens; totalCost += event.cost; }
    else if (event.type === "tool-call") cur = { name: event.name, input: event.input };
    else if (event.type === "tool-result") { if (cur) { toolCalls.push({ ...cur, output: event.output }); cur = null; } options.onToolCall?.({ agent: agentName, tool: event.name, durationMs: event.durationMs, iteration: event.iteration }); }
    else if (event.type === "error") options.onError?.({ agent: agentName, error: event.message, timestamp: Date.now() });
  }
  emitCallComplete(options, ctx, promptTok + completionTok, totalCost, content);
  if (options.memoryStore && threadId) await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], content);
  return jsonResponse({ content, usage: { promptTokens: promptTok, completionTokens: completionTok }, cost: totalCost, toolCalls: toolCalls.length > 0 ? toolCalls : undefined, threadId }, 200);
}

function emitCallComplete(options: AgentHandlerOptions, ctx: LoopContext, tokens: number, cost: number, outputText: string) {
  options.onCallComplete?.({
    agent: ctx.agentName, model: options.model, tokens, cost,
    durationMs: Date.now() - ctx.requestStartMs,
    inputMessages: ctx.messages.map((m) => ({ role: m.role, content: m.content })),
    outputText: outputText || undefined,
  });
}

export async function handleNoTools(options: AgentHandlerOptions, ctx: LoopContext): Promise<Response> {
  const { agentName, sessionId, threadId, sanitized, messages, budgetContext } = ctx;
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
      emitCallComplete(options, ctx, result.usage.promptTokens + result.usage.completionTokens, result.cost, result.content);
      if (options.memoryStore && threadId) await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], result.content);
      yield { type: "text", content: result.content };
      yield { type: "usage", promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens, cost: result.cost };
      yield { type: "done" };
    });
  }

  const result = await callLLM();
  recordCost(agentName, sessionId, result.cost, budgetContext);
  emitCallComplete(options, ctx, result.usage.promptTokens + result.usage.completionTokens, result.cost, result.content);
  if (options.memoryStore && threadId) await persistMessages(options.memoryStore, threadId, sanitized[sanitized.length - 1], result.content);
  return jsonResponse({ ...result, threadId }, 200);
}
