import type { Plugin, ViteDevServer, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { applySecurityHeaders } from "../middleware/security";
import { broadcastSSE } from "./dashboard-sse";
import { createDashboardState } from "./dashboard-state";
import type { CallRecord, ToolCallRecord, ErrorRecord } from "./dashboard-state";
import {
  handleSSE, handleDataset, handleCallDetail,
  handleExport, handleApiSummary, handleDashboardHtml,
} from "./dashboard-routes";

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4000;
const MAX_OUTPUT_CHARS = 8000;

function contentToDisplayString(content: string | unknown[]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

function capMessages(
  msgs: Array<{ role: string; content: string | unknown[] }>
): Array<{ role: string; content: string }> {
  const capped = msgs.length > MAX_MESSAGES
    ? [...msgs.slice(0, 5), ...msgs.slice(-15)]
    : msgs;
  return capped.map((m) => {
    const str = contentToDisplayString(m.content);
    return {
      role: m.role,
      content: str.length > MAX_CONTENT_CHARS ? str.slice(0, MAX_CONTENT_CHARS) : str,
    };
  });
}

const state = createDashboardState();

export function setAgents(count: number) { state.agentCount = count; }
export function setTools(count: number) { state.toolCount = count; }
export function setSkills(count: number) { state.skillCount = count; }
export function setThreadCount(count: number) { state.threadCount = count; }
export function setMaxDelegationDepth(depth: number) { state.maxDelegationDepth = depth; }
export function setMCPExposed(exposed: boolean) { state.mcpExposed = exposed; }

export function recordCall(record: Omit<CallRecord, 'id' | 'inputMessages'> & { id?: string; inputMessages?: Array<{ role: string; content: string | unknown[] }> }) {
  const id = record.id ?? crypto.randomUUID();
  const entry: CallRecord = {
    ...record,
    id,
    inputMessages: record.inputMessages ? capMessages(record.inputMessages) : undefined,
    outputText: record.outputText && record.outputText.length > MAX_OUTPUT_CHARS
      ? record.outputText.slice(0, MAX_OUTPUT_CHARS)
      : record.outputText,
  };
  state.calls.push(entry);
  if (Number.isFinite(record.cost)) {
    state.totalCost += record.cost;
  }
  broadcastSSE(`data: ${JSON.stringify({ type: 'call-recorded', call: entry })}\n\n`);
}

export function recordToolCall(record: ToolCallRecord) { state.toolCalls.push(record); }
export function recordError(record: ErrorRecord) { state.errors.push(record); }

export function dashboardPlugin(): Plugin {
  return {
    name: "fabrk:dashboard",
    configureServer(server: ViteDevServer) {
      return () => {
        server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];
          if (!pathname.startsWith("/__ai")) return next();

          const remoteAddr = req.socket?.remoteAddress;
          if (remoteAddr && remoteAddr !== "127.0.0.1" && remoteAddr !== "::1" && remoteAddr !== "::ffff:127.0.0.1") {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Dashboard only available on localhost" }));
            return;
          }

          routeRequest(req, res, pathname, next);
        });
      };
    },
  };
}

function routeRequest(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  pathname: string,
  next: Connect.NextFunction
): void {
  if (pathname === "/__ai/events" && req.method === "GET") return handleSSE(res);
  if (pathname === "/__ai/api/dataset" && req.method === "GET") return handleDataset(req, res, state);
  if (pathname.startsWith("/__ai/api/calls/") && req.method === "GET") return handleCallDetail(pathname, res, state);
  if (pathname === "/__ai/api/export") return handleExport(req, res, state);
  if (pathname === "/__ai/api") return handleApiSummary(res, state);
  if (pathname === "/__ai" || pathname === "/__ai/") return handleDashboardHtml(res);
  next();
}
