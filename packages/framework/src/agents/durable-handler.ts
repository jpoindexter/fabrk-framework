import type { LLMMessage, LLMToolSchema, LLMToolResult, LLMStreamEvent } from "@fabrk/ai";
import type { AgentBudget } from "./define-agent";
import type { ToolExecutor } from "./tool-executor";
import type { CheckpointStore, CheckpointState } from "./checkpoint";
import { generateCheckpointId } from "./checkpoint";
import { runAgentLoop, type AgentLoopEvent } from "./agent-loop";

// Re-export route handlers so existing barrel imports keep working
export { handleAgentStatus, handleAgentHistory, handleAgentRollback } from "./durable-routes";

export interface DurableAgentOptions {
  agentName: string;
  sessionId: string;
  model: string;
  budget?: AgentBudget;
  maxIterations?: number;
  toolExecutor: ToolExecutor;
  toolSchemas: LLMToolSchema[];
  checkpointStore: CheckpointStore;
  generateWithTools: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => Promise<LLMToolResult>;
  streamWithTools?: (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => AsyncGenerator<LLMStreamEvent>;
  calculateCost: (model: string, promptTokens: number, completionTokens: number) => { costUSD: number };
}

function buildCheckpointState(
  checkpointId: string,
  base: { agentName: string; createdAt: number },
  messages: LLMMessage[],
  iteration: number,
  toolResults: Array<{ name: string; output: string }>,
  status: CheckpointState["status"],
): CheckpointState {
  return {
    id: checkpointId,
    agentName: base.agentName,
    messages,
    iteration,
    toolResults,
    status,
    createdAt: base.createdAt,
    updatedAt: Date.now(),
  };
}

function makeLoopOptions(messages: LLMMessage[], options: DurableAgentOptions) {
  return {
    messages,
    toolExecutor: options.toolExecutor,
    toolSchemas: options.toolSchemas,
    agentName: options.agentName,
    sessionId: options.sessionId,
    model: options.model,
    budget: options.budget,
    maxIterations: options.maxIterations,
    stream: false as const,
    generateWithTools: options.generateWithTools,
    calculateCost: options.calculateCost,
  };
}

async function drainLoop(
  gen: AsyncGenerator<AgentLoopEvent>,
  checkpointId: string,
  base: { agentName: string; createdAt: number },
  loopMessages: LLMMessage[],
  store: CheckpointStore,
  initialIteration: number,
  initialToolResults: Array<{ name: string; output: string }>,
): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  let iteration = initialIteration;
  const toolResults = [...initialToolResults];

  for await (const event of gen) {
    events.push(event);

    if (event.type === "tool-result") {
      toolResults.push({ name: event.name, output: event.output });
      iteration = event.iteration;
    }

    if (event.type === "tool-result" || event.type === "usage") {
      await store.save(checkpointId, buildCheckpointState(checkpointId, base, loopMessages, iteration, toolResults, "running"));
    }
    if (event.type === "done") {
      await store.save(checkpointId, buildCheckpointState(checkpointId, base, loopMessages, iteration, toolResults, "completed"));
    }
    if (event.type === "error") {
      await store.save(checkpointId, buildCheckpointState(checkpointId, base, loopMessages, iteration, toolResults, "error"));
    }
  }

  return events;
}

export async function handleStartAgent(
  messages: LLMMessage[],
  options: DurableAgentOptions,
): Promise<{ checkpointId: string; events: AgentLoopEvent[] }> {
  const checkpointId = generateCheckpointId();
  const now = Date.now();
  const base = { agentName: options.agentName, createdAt: now };

  await options.checkpointStore.save(
    checkpointId,
    buildCheckpointState(checkpointId, base, [...messages], 0, [], "running"),
  );

  const loopMessages = [...messages];
  const gen = runAgentLoop(makeLoopOptions(loopMessages, options));
  const events = await drainLoop(gen, checkpointId, base, loopMessages, options.checkpointStore, 0, []);

  return { checkpointId, events };
}

export async function handleResumeAgent(
  checkpointId: string,
  options: DurableAgentOptions,
): Promise<{ events: AgentLoopEvent[] }> {
  const state = await options.checkpointStore.load(checkpointId);
  if (!state) throw new Error("Checkpoint not found");
  if (state.agentName !== options.agentName) throw new Error("Checkpoint does not belong to this agent");
  if (state.status === "completed") throw new Error("Agent execution already completed");

  const base = { agentName: state.agentName, createdAt: state.createdAt };
  await options.checkpointStore.save(checkpointId, { ...state, status: "running", updatedAt: Date.now() });

  const loopMessages = [...state.messages];
  const gen = runAgentLoop(makeLoopOptions(loopMessages, options));
  const events = await drainLoop(gen, checkpointId, base, loopMessages, options.checkpointStore, state.iteration, state.toolResults);

  return { events };
}
