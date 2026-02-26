export interface AgentBudget {
  daily?: number;
  perSession?: number;
  alertThreshold?: number;
}

export interface AgentDefinition {
  model: string;
  fallback?: string[];
  systemPrompt?: string;
  tools: string[];
  budget?: AgentBudget;
  stream: boolean;
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
