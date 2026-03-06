import type { CheckpointStore } from "./checkpoint";
import { buildSecurityHeaders } from "../middleware/security";

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

const LOCAL_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Returns true only when remoteAddress is a known loopback address. */
function isLocalRequest(remoteAddress?: string): boolean {
  if (!remoteAddress) return false;
  return LOCAL_ADDRS.has(remoteAddress);
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
  remoteAddress?: string,
): Promise<Response> {
  if (!isLocalRequest(remoteAddress)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
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
      400,
    );
  }
  if (
    !Number.isInteger(targetIteration) ||
    targetIteration < 0 ||
    targetIteration >= 10_000
  ) {
    return jsonResponse(
      { error: "targetIteration must be a non-negative integer less than 10000" },
      400,
    );
  }

  try {
    const restored = await store.rollback(agentName, sessionId, targetIteration);
    return jsonResponse(restored, 200);
  } catch (err) {
    console.error("[fabrk] Rollback failed:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "Rollback failed" }, 404);
  }
}
