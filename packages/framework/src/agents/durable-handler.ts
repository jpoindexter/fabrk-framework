import type { LLMMessage, LLMToolSchema, LLMToolResult, LLMStreamEvent } from "@fabrk/ai";
import type { AgentBudget } from "./define-agent";
import type { ToolExecutor } from "./tool-executor";
import type { CheckpointStore, CheckpointState } from "./checkpoint";
import { generateCheckpointId } from "./checkpoint";
import { runAgentLoop, type AgentLoopEvent } from "./agent-loop";
import { buildSecurityHeaders } from "../middleware/security";

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

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

const LOCAL_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Returns true when remoteAddress is absent (not enforced) or is a loopback address. */
function isLocalRequest(remoteAddress?: string): boolean {
  if (remoteAddress === undefined) return true;
  return LOCAL_ADDRS.has(remoteAddress);
}

export async function handleStartAgent(
  messages: LLMMessage[],
  options: DurableAgentOptions,
): Promise<{ checkpointId: string; events: AgentLoopEvent[] }> {
  const checkpointId = generateCheckpointId();
  const now = Date.now();

  const initialState: CheckpointState = {
    id: checkpointId,
    agentName: options.agentName,
    messages: [...messages],
    iteration: 0,
    toolResults: [],
    status: "running",
    createdAt: now,
    updatedAt: now,
  };
  await options.checkpointStore.save(checkpointId, initialState);

  const events: AgentLoopEvent[] = [];
  const loopMessages = [...messages];

  const gen = runAgentLoop({
    messages: loopMessages,
    toolExecutor: options.toolExecutor,
    toolSchemas: options.toolSchemas,
    agentName: options.agentName,
    sessionId: options.sessionId,
    model: options.model,
    budget: options.budget,
    maxIterations: options.maxIterations,
    stream: false,
    generateWithTools: options.generateWithTools,
    calculateCost: options.calculateCost,
  });

  let iteration = 0;
  const toolResults: Array<{ name: string; output: string }> = [];

  for await (const event of gen) {
    events.push(event);

    if (event.type === "tool-result") {
      toolResults.push({ name: event.name, output: event.output });
      iteration = event.iteration;
    }

    if (event.type === "tool-result" || event.type === "usage") {
      await options.checkpointStore.save(checkpointId, {
        id: checkpointId,
        agentName: options.agentName,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "running",
        createdAt: initialState.createdAt,
        updatedAt: Date.now(),
      });
    }

    if (event.type === "done") {
      await options.checkpointStore.save(checkpointId, {
        id: checkpointId,
        agentName: options.agentName,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "completed",
        createdAt: initialState.createdAt,
        updatedAt: Date.now(),
      });
    }

    if (event.type === "error") {
      await options.checkpointStore.save(checkpointId, {
        id: checkpointId,
        agentName: options.agentName,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "error",
        createdAt: initialState.createdAt,
        updatedAt: Date.now(),
      });
    }
  }

  return { checkpointId, events };
}

export async function handleResumeAgent(
  checkpointId: string,
  options: DurableAgentOptions,
): Promise<{ events: AgentLoopEvent[] }> {
  const state = await options.checkpointStore.load(checkpointId);
  if (!state) {
    throw new Error("Checkpoint not found");
  }
  if (state.agentName !== options.agentName) {
    throw new Error("Checkpoint does not belong to this agent");
  }
  if (state.status === "completed") {
    throw new Error("Agent execution already completed");
  }

  const events: AgentLoopEvent[] = [];
  const loopMessages = [...state.messages];

  await options.checkpointStore.save(checkpointId, {
    ...state,
    status: "running",
    updatedAt: Date.now(),
  });

  const gen = runAgentLoop({
    messages: loopMessages,
    toolExecutor: options.toolExecutor,
    toolSchemas: options.toolSchemas,
    agentName: options.agentName,
    sessionId: options.sessionId,
    model: options.model,
    budget: options.budget,
    maxIterations: options.maxIterations,
    stream: false,
    generateWithTools: options.generateWithTools,
    calculateCost: options.calculateCost,
  });

  let iteration = state.iteration;
  const toolResults = [...state.toolResults];

  for await (const event of gen) {
    events.push(event);

    if (event.type === "tool-result") {
      toolResults.push({ name: event.name, output: event.output });
      iteration = event.iteration;
    }

    if (event.type === "tool-result" || event.type === "usage") {
      await options.checkpointStore.save(checkpointId, {
        ...state,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "running",
        updatedAt: Date.now(),
      });
    }

    if (event.type === "done") {
      await options.checkpointStore.save(checkpointId, {
        ...state,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "completed",
        updatedAt: Date.now(),
      });
    }

    if (event.type === "error") {
      await options.checkpointStore.save(checkpointId, {
        ...state,
        messages: loopMessages,
        iteration,
        toolResults,
        status: "error",
        updatedAt: Date.now(),
      });
    }
  }

  return { events };
}

export async function handleAgentStatus(
  agentName: string,
  checkpointId: string,
  store: CheckpointStore,
  remoteAddress?: string,
): Promise<Response> {
  if (!isLocalRequest(remoteAddress)) {
    return jsonResponse({ error: "Not available outside localhost" }, 403);
  }
  const state = await store.load(checkpointId);
  if (!state) {
    return jsonResponse({ error: "Checkpoint not found" }, 404);
  }
  if (state.agentName !== agentName) {
    // Do not reveal whether the checkpoint exists for a different agent
    return jsonResponse({ error: "Checkpoint not found" }, 404);
  }

  return jsonResponse({
    id: state.id,
    agentName: state.agentName,
    status: state.status,
    iteration: state.iteration,
    toolResults: state.toolResults,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    messageCount: state.messages.length,
  }, 200);
}

export async function handleAgentHistory(
  agentName: string,
  sessionId: string,
  store: CheckpointStore,
): Promise<Response> {
  const history = await store.listHistory(agentName, sessionId);
  return jsonResponse(history, 200);
}

export async function handleAgentRollback(
  agentName: string,
  req: Request,
  store: CheckpointStore,
  remoteAddress?: string,
): Promise<Response> {
  if (!isLocalRequest(remoteAddress)) {
    return jsonResponse({ error: "Not available outside localhost" }, 403);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { sessionId, targetIteration } = body as Record<string, unknown>;
  if (typeof sessionId !== "string" || typeof targetIteration !== "number") {
    return jsonResponse(
      { error: "sessionId (string) and targetIteration (number) required" },
      400
    );
  }
  if (
    !Number.isInteger(targetIteration) ||
    targetIteration < 0 ||
    targetIteration >= 10_000
  ) {
    return jsonResponse(
      { error: "targetIteration must be a non-negative integer less than 10000" },
      400
    );
  }

  try {
    const restored = await store.rollback(agentName, sessionId, targetIteration);
    return jsonResponse(restored, 200);
  } catch (err) {
    // Log details server-side; return a generic message to the caller
    console.error("[fabrk] Rollback failed:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "Rollback failed" }, 404);
  }
}
