export interface AgentBudget {
  /** Maximum USD per day */
  daily?: number;
  /** Maximum USD per session/conversation */
  perSession?: number;
  /** Alert at this percentage of budget (0-1) */
  alertThreshold?: number;
}

export interface AgentDefinition {
  /** Primary model identifier */
  model: string;
  /** Fallback model chain */
  fallback?: string[];
  /** System prompt: inline string or file path */
  systemPrompt?: string;
  /** Tool names (resolved from tools/ directory) */
  tools: string[];
  /** Budget enforcement */
  budget?: AgentBudget;
  /** Enable streaming (default: true) */
  stream: boolean;
  /** Auth requirement */
  auth: "required" | "optional" | "none";
}

export interface DefineAgentOptions {
  model: string;
  fallback?: string[];
  systemPrompt?: string;
  tools?: string[];
  budget?: AgentBudget;
  stream?: boolean;
  auth?: "required" | "optional" | "none";
}

/**
 * Define an AI agent. Used in agents/[name]/agent.ts files.
 */
export function defineAgent(options: DefineAgentOptions): AgentDefinition {
  return {
    model: options.model,
    fallback: options.fallback,
    systemPrompt: options.systemPrompt,
    tools: options.tools ?? [],
    budget: options.budget,
    stream: options.stream ?? true,
    auth: options.auth ?? "none",
  };
}
