import { buildSecurityHeaders } from '../middleware/security.js';

const APPROVAL_TTL_MS = 300_000; // 5 minutes
const MAX_PENDING_APPROVALS = 1_000;
const MAX_MODIFIED_INPUT_KEYS = 50;
const MAX_MODIFIED_INPUT_BYTES = 64 * 1024; // 64 KB

interface ApprovalEntry {
  resolve: (result: { approved: boolean; modifiedInput?: Record<string, unknown> }) => void;
  reject?: (err: Error) => void;
  toolName: string;
  expiresAt?: number;
}

export const pendingApprovals = new Map<string, Map<string, ApprovalEntry>>();

/** Remove all entries whose TTL has elapsed across all agents. */
function evictExpired(): void {
  const now = Date.now();
  for (const [agentName, agentMap] of pendingApprovals.entries()) {
    for (const [approvalId, entry] of agentMap.entries()) {
      if (entry.expiresAt !== undefined && now >= entry.expiresAt) {
        agentMap.delete(approvalId);
        try {
          entry.reject?.(new Error('Approval request timed out'));
        } catch {
          // resolver already settled — ignore
        }
      }
    }
    if (agentMap.size === 0) pendingApprovals.delete(agentName);
  }
}

/** Count total pending approvals across all agents. */
function totalPending(): number {
  let n = 0;
  for (const m of pendingApprovals.values()) n += m.size;
  return n;
}

export function getAgentApprovals(agentName: string): Map<string, ApprovalEntry> {
  if (!pendingApprovals.has(agentName)) pendingApprovals.set(agentName, new Map());
  return pendingApprovals.get(agentName)!;
}

/**
 * Register a pending approval and return a Promise that resolves or rejects
 * when the approval is submitted or times out.
 */
export function waitForApproval(
  agentName: string,
  approvalId: string,
  toolName: string,
): Promise<{ approved: boolean; modifiedInput?: Record<string, unknown> }> {
  evictExpired();
  if (totalPending() >= MAX_PENDING_APPROVALS) {
    return Promise.reject(new Error('Approval queue full — try again later'));
  }
  return new Promise((resolve, reject) => {
    getAgentApprovals(agentName).set(approvalId, {
      resolve,
      reject,
      toolName,
      expiresAt: Date.now() + APPROVAL_TTL_MS,
    });
  });
}

export function createApprovalHandler() {
  return async (req: Request, agentName: string): Promise<Response> => {
    const headers = { 'Content-Type': 'application/json', ...buildSecurityHeaders() };
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }
    const { approvalId, approved, modifiedInput } = body as Record<string, unknown>;
    if (typeof approvalId !== 'string' || typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'approvalId (string) and approved (boolean) required' }),
        { status: 400, headers }
      );
    }

    // Validate modifiedInput: must be a plain object, size-bounded, key-count bounded.
    // The tool-executor does a JSON round-trip to strip prototype chains, but we validate
    // structural constraints here so oversized payloads never reach the tool handler.
    let safeModifiedInput: Record<string, unknown> | undefined;
    if (approved && modifiedInput !== undefined) {
      if (
        typeof modifiedInput !== 'object' ||
        modifiedInput === null ||
        Array.isArray(modifiedInput)
      ) {
        return new Response(
          JSON.stringify({ error: 'modifiedInput must be a plain object' }),
          { status: 400, headers }
        );
      }
      const keys = Object.keys(modifiedInput as object);
      if (keys.length > MAX_MODIFIED_INPUT_KEYS) {
        return new Response(
          JSON.stringify({ error: `modifiedInput exceeds ${MAX_MODIFIED_INPUT_KEYS} key limit` }),
          { status: 400, headers }
        );
      }
      const serialized = JSON.stringify(modifiedInput);
      if (serialized.length > MAX_MODIFIED_INPUT_BYTES) {
        return new Response(
          JSON.stringify({ error: 'modifiedInput payload too large' }),
          { status: 400, headers }
        );
      }
      safeModifiedInput = modifiedInput as Record<string, unknown>;
    }

    evictExpired();
    const entry = getAgentApprovals(agentName).get(approvalId);
    if (!entry) {
      return new Response(
        JSON.stringify({ error: 'Approval request not found or expired' }),
        { status: 404, headers }
      );
    }
    getAgentApprovals(agentName).delete(approvalId);
    entry.resolve({
      approved,
      modifiedInput: safeModifiedInput,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  };
}

/** Lists pending approval IDs and tool names for a given agent. */
export function handleListApprovals(agentName: string): Response {
  evictExpired();
  const headers = { 'Content-Type': 'application/json', ...buildSecurityHeaders() };
  const agentMap = pendingApprovals.get(agentName);
  const approvals: Array<{ approvalId: string; toolName: string }> = [];
  if (agentMap) {
    for (const [approvalId, entry] of agentMap.entries()) {
      approvals.push({ approvalId, toolName: entry.toolName });
    }
  }
  return new Response(JSON.stringify(approvals), { status: 200, headers });
}
