export interface NetworkContext {
  previousAgent?: string;
  iteration: number;
  history: Array<{ agent: string; input: string; output: string }>;
}

export interface AgentNetworkConfig {
  agents: Record<string, { execute: (input: string, context: NetworkContext) => Promise<string> }>;
  router: (input: string, context: NetworkContext) => string | Promise<string>;
  maxHops?: number;
}

export interface AgentNetworkResult {
  output: string;
  hops: number;
  history: NetworkContext['history'];
}

export interface AgentNetwork {
  run(input: string, opts?: { sessionId?: string }): Promise<AgentNetworkResult>;
}

export function defineAgentNetwork(config: AgentNetworkConfig): AgentNetwork {
  const maxHops = config.maxHops ?? 10;

  return {
    async run(input: string, _opts?: { sessionId?: string }): Promise<AgentNetworkResult> {
      const context: NetworkContext = {
        previousAgent: undefined,
        iteration: 0,
        history: [],
      };

      let currentInput = input;
      let hops = 0;
      let lastOutput = input;

      while (hops < maxHops) {
        const agentName = await config.router(currentInput, context);

        if (agentName === "END") {
          break;
        }

        const agent = config.agents[agentName];
        if (!agent) {
          throw new Error(`Agent "${agentName}" not found in network`);
        }

        const output = await agent.execute(currentInput, context);

        context.history.push({ agent: agentName, input: currentInput, output });
        context.previousAgent = agentName;
        context.iteration++;
        hops++;
        lastOutput = output;
        currentInput = output;
      }

      return {
        output: lastOutput,
        hops,
        history: context.history,
      };
    },
  };
}
