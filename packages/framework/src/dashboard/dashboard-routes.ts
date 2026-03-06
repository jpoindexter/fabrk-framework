import type { ServerResponse } from "node:http";
import type { Connect } from "vite";
import { applySecurityHeaders } from "../middleware/security";
import { generateDashboardHtml } from "./inspector-html";
import { canAcceptConnection, addSink } from "./dashboard-sse";
import type { CallRecord, DashboardState } from "./dashboard-state";

export function handleSSE(res: ServerResponse): void {
  if (!canAcceptConnection()) {
    res.statusCode = 429;
    res.setHeader("Content-Type", "text/plain");
    applySecurityHeaders(res);
    res.end("Too many connections");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  applySecurityHeaders(res);
  res.flushHeaders();
  addSink(res);
}

export function handleDataset(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  state: DashboardState
): void {
  const params = new URL(req.url ?? "/", "http://localhost").searchParams;
  const agentFilter = params.get("agent") ?? undefined;
  const limitParam = parseInt(params.get("limit") ?? "50", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

  let records = state.calls.toArray();
  if (agentFilter) records = records.filter((r: CallRecord) => r.agent === agentFilter);
  records = records.slice(-limit);

  const cases = records
    .filter((r: CallRecord) => r.inputMessages?.length && r.outputText)
    .map((r: CallRecord) => ({
      input: (r.inputMessages?.at(-1)?.content ?? "").slice(0, 2000),
      expectedOutput: (r.outputText ?? "").slice(0, 2000),
    }));

  const dataset = {
    name: `${agentFilter ?? "all"}-traces`,
    version: 1,
    cases,
    createdAt: new Date().toISOString(),
  };
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  applySecurityHeaders(res);
  res.end(JSON.stringify(dataset));
}

export function handleCallDetail(
  pathname: string,
  res: ServerResponse,
  state: DashboardState
): void {
  const rawCallId = pathname.slice("/__ai/api/calls/".length);
  const callId = rawCallId.slice(0, 100);
  const call = state.calls.toArray().find((c: CallRecord) => c.id === callId);
  if (!call) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    applySecurityHeaders(res);
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  applySecurityHeaders(res);
  res.end(JSON.stringify(call));
}

export function handleExport(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  state: DashboardState
): void {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Allow", "GET");
    applySecurityHeaders(res);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=fabrk-dashboard-export.json");
  applySecurityHeaders(res);
  res.end(JSON.stringify(state.getExportData(), null, 2));
}

export function handleApiSummary(res: ServerResponse, state: DashboardState): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  applySecurityHeaders(res);
  res.end(JSON.stringify(state.getSummaryData()));
}

export function handleDashboardHtml(res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  applySecurityHeaders(res);
  res.end(generateDashboardHtml());
}
