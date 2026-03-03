import { buildSecurityHeaders } from '../middleware/security.js';

interface ApprovalEntry {
  resolve: (result: { approved: boolean; modifiedInput?: Record<string, unknown> }) => void;
  toolName: string;
}

// Module-level map: agentName -> Map<approvalId, ApprovalEntry>
export const pendingApprovals = new Map<string, Map<string, ApprovalEntry>>();

export function getAgentApprovals(agentName: string): Map<string, ApprovalEntry> {
  if (!pendingApprovals.has(agentName)) pendingApprovals.set(agentName, new Map());
  return pendingApprovals.get(agentName)!;
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
      modifiedInput: approved ? (modifiedInput as Record<string, unknown>) : undefined,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  };
}

/** Lists pending approval IDs and tool names for a given agent. */
export function handleListApprovals(agentName: string): Response {
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
