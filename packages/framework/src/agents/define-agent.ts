import type { GenerationOptions } from "@fabrk/ai";
import type { SkillDefinition } from "../skills/define-skill";
import type { Guardrail } from "./guardrails";
import type { ToolExecutorHooks } from "./tool-executor";
import type { ThreadMessage } from "./memory/types";
import type { WorkingMemoryConfig } from "./memory/working-memory";

export type { GenerationOptions } from "@fabrk/ai";
export type { ToolChoiceValue } from "@fabrk/ai";

export interface AgentBudget {
  daily?: number;
  perSession?: number;
  alertThreshold?: number;
  /** Maximum daily spend per userId (passed via BudgetContext). */
  perUser?: number;
  /** Maximum daily spend per tenantId (passed via BudgetContext). */
  perTenant?: number;
}

export interface AgentMemoryConfig {
  maxMessages?: number;
  semantic?: boolean | { topK?: number; threshold?: number };
  compression?: {
    enabled?: boolean;
    triggerAt?: number;
    keepRecent?: number;
    summarize: (messages: ThreadMessage[]) => Promise<string>;
  };
  workingMemory?: WorkingMemoryConfig;
}

export interface AgentDefinition {
  model: string;
  fallback?: string[];
  systemPrompt?: string;
  tools: string[];
  budget?: AgentBudget;
  stream: boolean;
  auth: "required" | "optional" | "none";
  memory?: boolean | AgentMemoryConfig;
  agents?: Array<{ name: string; description: string }>;
  skills?: SkillDefinition[];
  inputGuardrails?: Guardrail[];
  outputGuardrails?: Guardrail[];
  toolHooks?: ToolExecutorHooks;
  generationOptions?: GenerationOptions;
  /** Agent names this agent can hand off to. When a tool call matches, a handoff event is emitted. */
  handoffs?: string[];
}

export interface DefineAgentOptions {
  model: string;
  fallback?: string[];
  systemPrompt?: string;
  tools?: string[];
  budget?: AgentBudget;
  stream?: boolean;
  auth?: "required" | "optional" | "none";
  memory?: boolean | AgentMemoryConfig;
  agents?: Array<{ name: string; description: string }>;
  skills?: SkillDefinition[];
  inputGuardrails?: Guardrail[];
  outputGuardrails?: Guardrail[];
  toolHooks?: ToolExecutorHooks;
  generationOptions?: GenerationOptions;
  /** Agent names this agent can hand off to. When a tool call matches, a handoff event is emitted. */
  handoffs?: string[];
}

export function defineAgent(options: DefineAgentOptions): AgentDefinition {
  return {
    model: options.model,
    fallback: options.fallback,
    systemPrompt: options.systemPrompt,
    tools: options.tools ?? [],
    budget: options.budget,
    stream: options.stream ?? true,
    auth: options.auth ?? "none",
    memory: options.memory,
    agents: options.agents,
    skills: options.skills,
    inputGuardrails: options.inputGuardrails,
    outputGuardrails: options.outputGuardrails,
    toolHooks: options.toolHooks,
    generationOptions: options.generationOptions,
    handoffs: options.handoffs,
  };
}
