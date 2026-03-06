import type { LLMMessage, LLMToolSchema, LLMToolResult, LLMStreamEvent, GenerationOptions } from "@fabrk/ai";
import type { AgentBudget } from "./define-agent";
import type { ToolExecutor } from "./tool-executor";
import type { Guardrail } from "./guardrails";
import type { BudgetContext } from "./budget-guard";
import type { StopCondition } from "./stop-conditions";

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
  handoffs?: string[];
  outputSchema?: Record<string, unknown>;
}
