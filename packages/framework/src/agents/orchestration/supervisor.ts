import type { AgentDefinition, AgentBudget } from "../define-agent";
import { agentAsTool } from "./agent-tool";
import type { ToolDefinition } from "../../tools/define-tool";

const MAX_DELEGATIONS_CAP = 10;

export interface SupervisorConfig {
  name: string;
  model: string;
  agents: Array<{ name: string; description: string }>;
  strategy: "router" | "planner";
  maxDelegations?: number;
  budget?: AgentBudget;
  systemPrompt?: string;
  /** Auth requirement for the supervisor route. Defaults to "required". */
  auth?: "required" | "none";
  handlerFactory: (name: string) => Promise<(req: Request) => Promise<Response>>;
}

export interface SupervisorDefinition extends AgentDefinition {
  maxDelegations: number;
  /** Actual ToolDefinition objects for agent-as-tool delegations. */
  toolDefinitions: ToolDefinition[];
}

export function defineSupervisor(config: SupervisorConfig): SupervisorDefinition {
  const maxDelegations = Math.min(config.maxDelegations ?? 5, MAX_DELEGATIONS_CAP);

  const agentTools: ToolDefinition[] = config.agents.map((a) =>
    agentAsTool(
      { name: a.name, description: a.description },
      config.handlerFactory
    )
  );

  const strategyPrompt = config.strategy === "router"
    ? "You are a routing supervisor. Analyze the user's request and delegate to the most appropriate agent. Only delegate once per request."
    : "You are a planning supervisor. Break the user's request into steps and delegate each step to the appropriate agent. Execute steps in order.";

  const systemPrompt = config.systemPrompt
    ? `${strategyPrompt}\n\n${config.systemPrompt}`
    : strategyPrompt;

  return {
    model: config.model,
    systemPrompt,
    tools: agentTools.map((t) => t.name),
    toolDefinitions: agentTools,
    budget: config.budget,
    stream: true,
    auth: config.auth ?? "required",
    agents: config.agents,
    memory: false,
    maxDelegations,
  };
}
