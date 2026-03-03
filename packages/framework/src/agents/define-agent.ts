import type { SkillDefinition } from "../skills/define-skill";
import type { Guardrail } from "./guardrails";

export interface AgentBudget {
  daily?: number;
  perSession?: number;
  alertThreshold?: number;
}

export interface AgentMemoryConfig {
  maxMessages?: number;
  semantic?: boolean | { topK?: number; threshold?: number };
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
  };
}
