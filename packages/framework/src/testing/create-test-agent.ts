import type { ToolDefinition } from "../tools/define-tool";
import { MockLLM } from "./mock-llm";

export interface TestAgentOptions {
  name?: string;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  mock: MockLLM;
  stream?: boolean;
  maxIterations?: number;
}

export interface TestAgentResult {
  content: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number; cost: number };
  events: AgentEvent[];
}

interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export function createTestAgent(options: TestAgentOptions) {
  const {
    name = "test-agent",
    systemPrompt,
    tools = [],
    mock,
    stream = false,
    maxIterations = 10,
  } = options;

  return {
    async send(message: string): Promise<TestAgentResult> {
      const { createToolExecutor } = await import("../agents/tool-executor");

      const toolDefs = tools;
      const toolSchemas = toolDefs.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.schema,
        },
      }));

      const executor = createToolExecutor(toolDefs);
      const events: AgentEvent[] = [];
      const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
      let content = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let cost = 0;

      const { runAgentLoop } = await import("../agents/agent-loop");

      const messages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        { role: "user" as const, content: message },
      ];

      const loop = runAgentLoop({
        messages,
        toolExecutor: executor,
        toolSchemas,
        agentName: name,
        sessionId: `test-${Date.now()}`,
        model: "mock-model",
        maxIterations,
        stream,
        generateWithTools: mock.asGenerateWithTools(),
        streamWithTools: mock.asStreamWithTools(),
        calculateCost: MockLLM.zeroCost(),
      });

      for await (const event of loop) {
        events.push(event as AgentEvent);

        switch (event.type) {
          case "text":
            content = event.content;
            break;
          case "text-delta":
            content += event.content;
            break;
          case "tool-call":
            toolCalls.push({ name: event.name, input: event.input });
            break;
          case "usage":
            promptTokens += event.promptTokens;
            completionTokens += event.completionTokens;
            cost += event.cost;
            break;
        }
      }

      return { content, toolCalls, usage: { promptTokens, completionTokens, cost }, events };
    },
  };
}

