export interface NetworkContext {
  previousAgent?: string;
  iteration: number;
  history: Array<{ agent: string; input: string; output: string }>;
}

export interface LLMRouterConfig {
  /** OpenAI model to use for routing decisions, e.g. 'gpt-4o-mini' */
  model: string;
  /** Optional system prompt override. Defaults to a routing prompt listing available agents. */
  systemPrompt?: string;
  /** Optional API key override. Falls back to OPENAI_API_KEY env var. */
  apiKey?: string;
}

export type RouterFn = (input: string, context: NetworkContext) => string | Promise<string>;

export interface AgentNetworkConfig {
  agents: Record<string, { execute: (input: string, context: NetworkContext) => Promise<string> }>;
  router: RouterFn | LLMRouterConfig;
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

async function resolveNextAgent(
  router: RouterFn | LLMRouterConfig,
  input: string,
  context: NetworkContext,
  agentNames: string[]
): Promise<string> {
  if (typeof router === 'function') {
    return router(input, context);
  }

  // LLM-based routing
  const names = agentNames.join(', ');
  const systemPrompt =
    router.systemPrompt ??
    `You are a routing agent. Given the user's message, decide which agent should handle it.\n` +
      `Available agents: ${names}\n` +
      `Reply with ONLY the exact agent name (one of: ${names}) or the word END to stop routing.`;

  const apiKey = router.apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: router.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      max_tokens: 50,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    // On API failure, stop routing rather than infinite-looping
    return 'END';
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = (data.choices[0]?.message?.content ?? '').trim();

  if (text === 'END' || agentNames.includes(text)) return text;
  // Unknown response → stop to avoid infinite loops
  return 'END';
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
        const agentName = await resolveNextAgent(
          config.router,
          currentInput,
          context,
          Object.keys(config.agents)
        );

        if (agentName === 'END') {
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
