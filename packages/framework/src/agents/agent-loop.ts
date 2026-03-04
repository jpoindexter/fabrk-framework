import type { LLMMessage, LLMToolSchema, LLMToolResult, LLMStreamEvent, LLMContentPart, GenerationOptions } from "@fabrk/ai";
import type { AgentBudget } from "./define-agent";
import type { ToolExecutor } from "./tool-executor";
import type { Guardrail } from "./guardrails";
import { runGuardrails } from "./guardrails";
import { checkBudget, recordCost, type BudgetContext } from "./budget-guard";
import { setSpanAttributes } from "../runtime/tracer";
import type { StopCondition, StopConditionContext } from "./stop-conditions";

const MAX_ITERATIONS_HARD_CAP = 25;

export type AgentLoopEvent =
  | { type: "text-delta"; content: string }
  | { type: "text"; content: string }
  | { type: "tool-call"; name: string; input: Record<string, unknown>; iteration: number }
  | { type: "tool-result"; name: string; output: string; durationMs: number; iteration: number }
  | { type: "usage"; promptTokens: number; completionTokens: number; cost: number }
  | { type: "done"; structuredOutput?: unknown }
  | { type: "error"; message: string }
  | { type: "approval-required"; toolName: string; input: Record<string, unknown>; approvalId: string; iteration: number }
  | { type: "handoff"; targetAgent: string; input: string; iteration: number }
  | { type: "structured-output"; data: unknown; iteration: number };

export interface AgentLoopOptions {
  messages: LLMMessage[];
  toolExecutor: ToolExecutor;
  toolSchemas: LLMToolSchema[];
  agentName: string;
  sessionId: string;
  model: string;
  budget?: AgentBudget;
  budgetContext?: BudgetContext;
  maxIterations?: number;
  stream: boolean;
  generationOptions?: GenerationOptions;
  generateWithTools: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
    opts?: GenerationOptions,
  ) => Promise<LLMToolResult>;
  streamWithTools?: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
    opts?: GenerationOptions,
  ) => AsyncGenerator<LLMStreamEvent>;
  calculateCost: (model: string, promptTokens: number, completionTokens: number) => { costUSD: number };
  inputGuardrails?: Guardrail[];
  outputGuardrails?: Guardrail[];
  stopWhen?: StopCondition | StopCondition[];
  /** Agent names this agent can hand off to. A handoff event is emitted when a matching tool is called. */
  handoffs?: string[];
  /** JSON Schema for structured output. When present, the final text response is parsed as JSON and emitted as a structured-output event. */
  outputSchema?: Record<string, unknown>;
}

export async function* runAgentLoop(
  options: AgentLoopOptions
): AsyncGenerator<AgentLoopEvent> {
  const maxIterations = Math.min(
    options.maxIterations ?? MAX_ITERATIONS_HARD_CAP,
    MAX_ITERATIONS_HARD_CAP
  );
  const messages = [...options.messages];
  const guardCtx = { agentName: options.agentName, sessionId: options.sessionId };

  if (options.inputGuardrails && options.inputGuardrails.length > 0) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const rawContent = lastUser.content;
      const textContent = typeof rawContent === "string"
        ? rawContent
        : (rawContent as LLMContentPart[])
            .filter((p): p is Extract<LLMContentPart, { type: "text" }> => p.type === "text")
            .map((p) => p.text)
            .join("");
      const result = runGuardrails(
        options.inputGuardrails,
        textContent,
        { ...guardCtx, direction: "input" },
      );
      if (result.blocked) {
        yield { type: "error", message: `Input guardrail blocked: ${result.reason}` };
        return;
      }
      if (result.content !== textContent) {
        if (typeof rawContent === "string") {
          lastUser.content = result.content;
        } else {
          lastUser.content = [{ type: "text", text: result.content } satisfies LLMContentPart];
        }
      }
    }
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const budgetError = checkBudget(options.agentName, options.sessionId, options.budget, options.budgetContext);
    if (budgetError) {
      yield { type: "error", message: budgetError };
      return;
    }

    if (options.stream && options.streamWithTools) {
      let fullText = "";
      const collectedToolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      for await (const event of options.streamWithTools(messages, options.toolSchemas, options.generationOptions)) {
        if (event.type === "text-delta") {
          fullText += event.content;
          yield { type: "text-delta", content: event.content };
        } else if (event.type === "tool-call") {
          collectedToolCalls.push({
            id: event.id,
            name: event.name,
            arguments: event.arguments,
          });
        } else if (event.type === "usage") {
          totalPromptTokens += event.promptTokens;
          totalCompletionTokens += event.completionTokens;
        }
      }

      const { costUSD } = options.calculateCost(options.model, totalPromptTokens, totalCompletionTokens);
      recordCost(options.agentName, options.sessionId, costUSD, options.budgetContext);
      setSpanAttributes({
        "llm.model": options.model,
        "llm.agent": options.agentName,
        "llm.tokens.prompt": totalPromptTokens,
        "llm.tokens.completion": totalCompletionTokens,
        "llm.cost_usd": costUSD,
        "llm.iteration": iteration,
      });
      yield {
        type: "usage",
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        cost: costUSD,
      };

      if (collectedToolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: fullText || "",
          toolCalls: collectedToolCalls,
        });

        for (const tc of collectedToolCalls) {
          yield { type: "tool-call", name: tc.name, input: tc.arguments, iteration };
        }

        const toolResults = await Promise.allSettled(
          collectedToolCalls.map((tc) => options.toolExecutor.execute(tc.name, tc.arguments))
        );

        const lastToolCallNames: string[] = [];
        for (let i = 0; i < collectedToolCalls.length; i++) {
          const tc = collectedToolCalls[i];
          const result = toolResults[i];
          lastToolCallNames.push(tc.name);
          if (result.status === "fulfilled") {
            const { output, durationMs } = result.value;
            yield { type: "tool-result", name: tc.name, output, durationMs, iteration };
            messages.push({ role: "tool", content: output, toolCallId: tc.id });
            if (options.handoffs?.includes(tc.name)) {
              yield { type: "handoff", targetAgent: tc.name, input: output, iteration };
            }
          } else {
            console.error(`[fabrk] Tool "${tc.name}" execution error:`, result.reason);
            yield { type: "tool-result", name: tc.name, output: "Error: Tool execution failed", durationMs: 0, iteration };
            messages.push({ role: "tool", content: "Error: Tool execution failed", toolCallId: tc.id });
            if (options.handoffs?.includes(tc.name)) {
              yield { type: "handoff", targetAgent: tc.name, input: "Error: Tool execution failed", iteration };
            }
          }
        }

        const conditions = options.stopWhen
          ? Array.isArray(options.stopWhen) ? options.stopWhen : [options.stopWhen]
          : [];
        if (conditions.length > 0) {
          const stopCtx: StopConditionContext = { iterationCount: iteration + 1, lastToolCallNames };
          if (conditions.some((c) => c(stopCtx))) {
            yield { type: "done" };
            return;
          }
        }

        continue;
      }

      if (options.outputGuardrails && options.outputGuardrails.length > 0) {
        const result = runGuardrails(
          options.outputGuardrails,
          fullText,
          { ...guardCtx, direction: "output" },
        );
        if (result.blocked) {
          yield { type: "error", message: `Output guardrail blocked: ${result.reason}` };
          return;
        }
        fullText = result.content;
      }
      yield { type: "text", content: fullText };
      let streamStructuredOutput: unknown;
      if (options.outputSchema) {
        try {
          streamStructuredOutput = JSON.parse(fullText);
          yield { type: "structured-output", data: streamStructuredOutput, iteration };
        } catch {
          // Not valid JSON — skip structured-output
        }
      }
      yield { type: "done", structuredOutput: streamStructuredOutput };
      return;
    }

    const result = await options.generateWithTools(messages, options.toolSchemas, options.generationOptions);
    const { costUSD } = options.calculateCost(
      options.model,
      result.usage.promptTokens,
      result.usage.completionTokens
    );
    recordCost(options.agentName, options.sessionId, costUSD, options.budgetContext);
    setSpanAttributes({
      "llm.model": options.model,
      "llm.agent": options.agentName,
      "llm.tokens.prompt": result.usage.promptTokens,
      "llm.tokens.completion": result.usage.completionTokens,
      "llm.cost_usd": costUSD,
      "llm.iteration": iteration,
    });
    yield {
      type: "usage",
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      cost: costUSD,
    };

    if (result.toolCalls && result.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: result.content || "",
        toolCalls: result.toolCalls,
      });

      const lastToolCallNames: string[] = [];
      for (const tc of result.toolCalls) {
        yield { type: "tool-call", name: tc.name, input: tc.arguments, iteration };
        lastToolCallNames.push(tc.name);

        try {
          const { output, durationMs } = await options.toolExecutor.execute(tc.name, tc.arguments);
          yield { type: "tool-result", name: tc.name, output, durationMs, iteration };
          messages.push({
            role: "tool",
            content: output,
            toolCallId: tc.id,
          });
          if (options.handoffs?.includes(tc.name)) {
            yield { type: "handoff", targetAgent: tc.name, input: output, iteration };
          }
        } catch (err) {
          console.error(`[fabrk] Tool "${tc.name}" execution error:`, err);
          yield { type: "tool-result", name: tc.name, output: "Error: Tool execution failed", durationMs: 0, iteration };
          messages.push({
            role: "tool",
            content: "Error: Tool execution failed",
            toolCallId: tc.id,
          });
          if (options.handoffs?.includes(tc.name)) {
            yield { type: "handoff", targetAgent: tc.name, input: "Error: Tool execution failed", iteration };
          }
        }
      }

      const conditions = options.stopWhen
        ? Array.isArray(options.stopWhen) ? options.stopWhen : [options.stopWhen]
        : [];
      if (conditions.length > 0) {
        const stopCtx: StopConditionContext = { iterationCount: iteration + 1, lastToolCallNames };
        if (conditions.some((c) => c(stopCtx))) {
          yield { type: "done" };
          return;
        }
      }

      continue;
    }

    let finalContent = result.content || "";
    if (options.outputGuardrails && options.outputGuardrails.length > 0) {
      const guardResult = runGuardrails(
        options.outputGuardrails,
        finalContent,
        { ...guardCtx, direction: "output" },
      );
      if (guardResult.blocked) {
        yield { type: "error", message: `Output guardrail blocked: ${guardResult.reason}` };
        return;
      }
      finalContent = guardResult.content;
    }
    yield { type: "text", content: finalContent };
    let batchStructuredOutput: unknown;
    if (options.outputSchema) {
      try {
        batchStructuredOutput = JSON.parse(finalContent);
        yield { type: "structured-output", data: batchStructuredOutput, iteration };
      } catch {
        // Not valid JSON — skip structured-output
      }
    }
    yield { type: "done", structuredOutput: batchStructuredOutput };
    return;
  }

  yield { type: "error", message: `Max iterations (${maxIterations}) reached` };
}
