import type { LLMMessage, LLMContentPart } from "@fabrk/ai";
import type { AgentLoopEvent, AgentLoopOptions } from "./agent-loop-types";
import { runGuardrails } from "./guardrails";
import { recordCost } from "./budget-guard";
import { setSpanAttributes } from "../runtime/tracer";

export function runInputGuardrails(
  options: AgentLoopOptions, messages: LLMMessage[],
  guardCtx: { agentName: string; sessionId: string },
): AgentLoopEvent | null {
  if (!options.inputGuardrails || options.inputGuardrails.length === 0) return null;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;

  const rawContent = lastUser.content;
  const textContent = typeof rawContent === "string"
    ? rawContent
    : (rawContent as LLMContentPart[])
        .filter((p): p is Extract<LLMContentPart, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");

  const result = runGuardrails(options.inputGuardrails, textContent, { ...guardCtx, direction: "input" });
  if (result.blocked) return { type: "error", message: `Input guardrail blocked: ${result.reason}` };
  if (result.content !== textContent) {
    lastUser.content = typeof rawContent === "string"
      ? result.content
      : [{ type: "text", text: result.content } satisfies LLMContentPart];
  }
  return null;
}

export function recordUsage(
  options: AgentLoopOptions, promptTokens: number, completionTokens: number, iteration: number,
): AgentLoopEvent {
  const { costUSD } = options.calculateCost(options.model, promptTokens, completionTokens);
  recordCost(options.agentName, options.sessionId, costUSD, options.budgetContext);
  setSpanAttributes({
    "llm.model": options.model, "llm.agent": options.agentName,
    "llm.tokens.prompt": promptTokens, "llm.tokens.completion": completionTokens,
    "llm.cost_usd": costUSD, "llm.iteration": iteration,
  });
  return { type: "usage", promptTokens, completionTokens, cost: costUSD };
}

export function runOutputGuardrails(
  options: AgentLoopOptions, text: string,
  guardCtx: { agentName: string; sessionId: string },
): { blocked: boolean; error?: AgentLoopEvent; content: string } {
  if (!options.outputGuardrails || options.outputGuardrails.length === 0) return { blocked: false, content: text };
  const result = runGuardrails(options.outputGuardrails, text, { ...guardCtx, direction: "output" });
  if (result.blocked) return { blocked: true, error: { type: "error", message: `Output guardrail blocked: ${result.reason}` }, content: text };
  return { blocked: false, content: result.content };
}

function* emitToolResult(
  tc: { id: string; name: string }, output: string, durationMs: number,
  messages: LLMMessage[], handoffs: string[] | undefined, iteration: number,
): Generator<AgentLoopEvent> {
  yield { type: "tool-result", name: tc.name, output, durationMs, iteration };
  messages.push({ role: "tool", content: output, toolCallId: tc.id });
  if (handoffs?.includes(tc.name)) yield { type: "handoff", targetAgent: tc.name, input: output, iteration };
}

export async function* processStreamToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
  fullText: string, messages: LLMMessage[],
  options: Pick<AgentLoopOptions, "toolExecutor" | "handoffs">, iteration: number,
): AsyncGenerator<AgentLoopEvent> {
  messages.push({ role: "assistant", content: fullText || "", toolCalls });
  for (const tc of toolCalls) yield { type: "tool-call", name: tc.name, input: tc.arguments, iteration };

  const results = await Promise.allSettled(toolCalls.map((tc) => options.toolExecutor.execute(tc.name, tc.arguments)));
  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      yield* emitToolResult(tc, r.value.output, r.value.durationMs, messages, options.handoffs, iteration);
    } else {
      console.error(`[fabrk] Tool "${tc.name}" execution error:`, r.reason);
      yield* emitToolResult(tc, "Error: Tool execution failed", 0, messages, options.handoffs, iteration);
    }
  }
}

export async function* processBatchToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
  resultContent: string, messages: LLMMessage[],
  options: Pick<AgentLoopOptions, "toolExecutor" | "handoffs">, iteration: number,
): AsyncGenerator<AgentLoopEvent> {
  messages.push({ role: "assistant", content: resultContent || "", toolCalls });
  for (const tc of toolCalls) {
    yield { type: "tool-call", name: tc.name, input: tc.arguments, iteration };
    try {
      const { output, durationMs } = await options.toolExecutor.execute(tc.name, tc.arguments);
      yield* emitToolResult(tc, output, durationMs, messages, options.handoffs, iteration);
    } catch (err) {
      console.error(`[fabrk] Tool "${tc.name}" execution error:`, err);
      yield* emitToolResult(tc, "Error: Tool execution failed", 0, messages, options.handoffs, iteration);
    }
  }
}

export function tryParseStructuredOutput(
  text: string, outputSchema: Record<string, unknown> | undefined, iteration: number,
): { event: AgentLoopEvent | null; parsed: unknown } {
  if (!outputSchema) return { event: null, parsed: undefined };
  try {
    const data = JSON.parse(text);
    return { event: { type: "structured-output", data, iteration }, parsed: data };
  } catch { return { event: null, parsed: undefined }; }
}

export function collectToolCallNames(toolCalls: Array<{ name: string }>): string[] {
  return toolCalls.map((tc) => tc.name);
}
