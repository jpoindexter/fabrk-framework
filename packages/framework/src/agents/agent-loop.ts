import type { LLMMessage } from "@fabrk/ai";
import { checkBudget } from "./budget-guard";
import type { StopCondition, StopConditionContext } from "./stop-conditions";
import {
  processStreamToolCalls, processBatchToolCalls, tryParseStructuredOutput,
  collectToolCallNames, runInputGuardrails, recordUsage, runOutputGuardrails,
} from "./agent-loop-tools";

export type { AgentLoopEvent, AgentLoopOptions } from "./agent-loop-types";
import type { AgentLoopEvent, AgentLoopOptions } from "./agent-loop-types";

const MAX_ITERATIONS_HARD_CAP = 25;
const MAX_HISTORY_MESSAGES = 200;

function evaluateStopConditions(
  stopWhen: StopCondition | StopCondition[] | undefined,
  iteration: number,
  lastToolCallNames: string[],
): { stop: boolean; error?: string } {
  const conditions = stopWhen
    ? Array.isArray(stopWhen) ? stopWhen : [stopWhen]
    : [];
  if (conditions.length === 0) return { stop: false };
  const ctx: StopConditionContext = { iterationCount: iteration + 1, lastToolCallNames };
  try {
    return { stop: conditions.some((c) => c(ctx)) };
  } catch (stopErr) {
    return { stop: true, error: `Stop condition threw: ${stopErr instanceof Error ? stopErr.message : String(stopErr)}` };
  }
}

function trimMessages(messages: LLMMessage[]): LLMMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  const systemMsgs = messages.filter((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  const keep = nonSystem.slice(-(MAX_HISTORY_MESSAGES - systemMsgs.length));
  return [...systemMsgs, ...keep];
}

export async function* runAgentLoop(options: AgentLoopOptions): AsyncGenerator<AgentLoopEvent> {
  const maxIterations = Math.min(options.maxIterations ?? MAX_ITERATIONS_HARD_CAP, MAX_ITERATIONS_HARD_CAP);
  const messages = [...options.messages];
  const guardCtx = { agentName: options.agentName, sessionId: options.sessionId };

  const guardError = runInputGuardrails(options, messages, guardCtx);
  if (guardError) { yield guardError; return; }

  if (options.stream && options.streamWithTools) {
    yield* streamLoop(options, messages, guardCtx, maxIterations);
  } else {
    yield* batchLoop(options, messages, guardCtx, maxIterations);
  }
}

async function* streamLoop(
  options: AgentLoopOptions, messages: LLMMessage[],
  guardCtx: { agentName: string; sessionId: string }, maxIterations: number,
): AsyncGenerator<AgentLoopEvent> {
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const budgetError = checkBudget(options.agentName, options.sessionId, options.budget, options.budgetContext);
    if (budgetError) { yield { type: "error", message: budgetError }; return; }

    let fullText = "";
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const event of options.streamWithTools!(trimMessages(messages), options.toolSchemas, options.generationOptions)) {
      if (event.type === "text-delta") { fullText += event.content; yield { type: "text-delta", content: event.content }; }
      else if (event.type === "tool-call") { toolCalls.push({ id: event.id, name: event.name, arguments: event.arguments }); }
      else if (event.type === "usage") { promptTokens += event.promptTokens; completionTokens += event.completionTokens; }
    }

    yield recordUsage(options, promptTokens, completionTokens, iteration);

    if (toolCalls.length > 0) {
      yield* processStreamToolCalls(toolCalls, fullText, messages, options, iteration);
      const stop = evaluateStopConditions(options.stopWhen, iteration, collectToolCallNames(toolCalls));
      if (stop.error) { yield { type: "error", message: stop.error }; return; }
      if (stop.stop) { yield { type: "done" }; return; }
      continue;
    }

    yield* emitFinalText(options, fullText, guardCtx, iteration);
    return;
  }
  yield { type: "error", message: `Max iterations (${maxIterations}) reached` };
}

async function* batchLoop(
  options: AgentLoopOptions, messages: LLMMessage[],
  guardCtx: { agentName: string; sessionId: string }, maxIterations: number,
): AsyncGenerator<AgentLoopEvent> {
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const budgetError = checkBudget(options.agentName, options.sessionId, options.budget, options.budgetContext);
    if (budgetError) { yield { type: "error", message: budgetError }; return; }

    const result = await options.generateWithTools(trimMessages(messages), options.toolSchemas, options.generationOptions);
    yield recordUsage(options, result.usage.promptTokens, result.usage.completionTokens, iteration);

    if (result.toolCalls && result.toolCalls.length > 0) {
      yield* processBatchToolCalls(result.toolCalls, result.content || "", messages, options, iteration);
      const stop = evaluateStopConditions(options.stopWhen, iteration, collectToolCallNames(result.toolCalls));
      if (stop.error) { yield { type: "error", message: stop.error }; return; }
      if (stop.stop) { yield { type: "done" }; return; }
      continue;
    }

    yield* emitFinalText(options, result.content || "", guardCtx, iteration);
    return;
  }
  yield { type: "error", message: `Max iterations (${maxIterations}) reached` };
}

function* emitFinalText(
  options: AgentLoopOptions, text: string,
  guardCtx: { agentName: string; sessionId: string }, iteration: number,
): Generator<AgentLoopEvent> {
  const guard = runOutputGuardrails(options, text, guardCtx);
  if (guard.blocked) { yield guard.error!; return; }
  yield { type: "text", content: guard.content };
  const { event, parsed } = tryParseStructuredOutput(guard.content, options.outputSchema, iteration);
  if (event) yield event;
  yield { type: "done", structuredOutput: parsed };
}
