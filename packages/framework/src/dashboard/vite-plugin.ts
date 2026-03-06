import type { Plugin, ViteDevServer, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { applySecurityHeaders } from "../middleware/security";
import { generateDashboardHtml } from "./inspector-html";

const sinks = new Set<ServerResponse>();
const MAX_SSE_CONNECTIONS = 5;

interface CallRecord {
  id: string;
  timestamp: number;
  agent: string;
  model: string;
  tokens: number;
  cost: number;
  durationMs?: number;
  inputMessages?: Array<{ role: string; content: string }>;
  outputText?: string;
}

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

interface ToolCallRecord {
  timestamp: number;
  agent: string;
  tool: string;
  durationMs: number;
  iteration: number;
}

interface ErrorRecord {
  timestamp: number;
  agent: string;
  error: string;
}

/** Fixed-capacity ring buffer — O(1) insert, O(N) snapshot for reads (acceptable for dashboard polling). */
class RingBuffer<T> {
  private buf: T[];
  private head = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buf = new Array(capacity);
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    if (this.count === 0) return [];
    if (this.count < this.capacity) return this.buf.slice(0, this.count);
    return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
  }

  get length(): number {
    return this.count;
  }
}

let agentCount = 0;
let toolCount = 0;
let skillCount = 0;
let threadCount = 0;
let maxDelegationDepth = 0;
let mcpExposed = false;
const calls = new RingBuffer<CallRecord>(100);
const toolCalls = new RingBuffer<ToolCallRecord>(200);
const errors = new RingBuffer<ErrorRecord>(100);
let totalCost = 0;

export function setAgents(count: number) {
  agentCount = count;
}

export function setTools(count: number) {
  toolCount = count;
}

export function setSkills(count: number) {
  skillCount = count;
}

export function setThreadCount(count: number) {
  threadCount = count;
}

export function setMaxDelegationDepth(depth: number) {
  maxDelegationDepth = depth;
}

export function setMCPExposed(exposed: boolean) {
  mcpExposed = exposed;
}

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
  calls.push(entry);
  if (Number.isFinite(record.cost)) {
    totalCost += record.cost;
  }
  const sseData = `data: ${JSON.stringify({ type: 'call-recorded', call: entry })}\n\n`;
  for (const sink of sinks) {
    try {
      sink.write(sseData);
    } catch {
      sinks.delete(sink);
    }
  }
}

export function recordToolCall(record: ToolCallRecord) {
  toolCalls.push(record);
}

export function recordError(record: ErrorRecord) {
  errors.push(record);
}

function getCostTrends(): Array<{ hour: string; cost: number; calls: number; byAgent: Record<string, number> }> {
  const buckets = new Map<string, { cost: number; calls: number; byAgent: Record<string, number> }>();

  for (const c of calls.toArray()) {
    const d = new Date(c.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { cost: 0, calls: 0, byAgent: {} };
      buckets.set(key, bucket);
    }
    bucket.cost += c.cost;
    bucket.calls += 1;
    bucket.byAgent[c.agent] = (bucket.byAgent[c.agent] ?? 0) + c.cost;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({ hour, ...data }));
}

function getToolStats(): Array<{ tool: string; count: number; avgMs: number; agents: string[] }> {
  const stats = new Map<string, { count: number; totalMs: number; agents: Set<string> }>();

  for (const tc of toolCalls.toArray()) {
    let s = stats.get(tc.tool);
    if (!s) {
      s = { count: 0, totalMs: 0, agents: new Set() };
      stats.set(tc.tool, s);
    }
    s.count += 1;
    s.totalMs += tc.durationMs;
    s.agents.add(tc.agent);
  }

  return Array.from(stats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([tool, s]) => ({
      tool,
      count: s.count,
      avgMs: Math.round(s.totalMs / s.count),
      agents: Array.from(s.agents),
    }));
}

function getErrorStats(): { total: number; byAgent: Record<string, number>; recent: ErrorRecord[] } {
  const byAgent: Record<string, number> = {};
  for (const e of errors.toArray()) {
    byAgent[e.agent] = (byAgent[e.agent] ?? 0) + 1;
  }
  const all = errors.toArray();
  return { total: all.length, byAgent, recent: all.slice(-20).reverse() };
}

export function dashboardPlugin(): Plugin {
  return {
    name: "fabrk:dashboard",

    configureServer(server: ViteDevServer) {
      return () => {
        server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (!pathname.startsWith("/__ai")) return next();

          // Localhost-only: dashboard must never be reachable from external traffic
          const remoteAddr = req.socket?.remoteAddress;
          if (
            remoteAddr &&
            remoteAddr !== "127.0.0.1" &&
            remoteAddr !== "::1" &&
            remoteAddr !== "::ffff:127.0.0.1"
          ) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Dashboard only available on localhost" }));
            return;
          }

          if (pathname === "/__ai/events" && req.method === "GET") {
            if (sinks.size >= MAX_SSE_CONNECTIONS) {
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
            sinks.add(res);
            const cleanup = () => { sinks.delete(res); };
            res.on("close", cleanup);
            res.on("error", cleanup);
            return;
          }

          if (pathname === "/__ai/api/dataset" && req.method === "GET") {
            const params = new URL(req.url ?? "/", "http://localhost").searchParams;
            const agentFilter = params.get("agent") ?? undefined;
            const limitParam = parseInt(params.get("limit") ?? "50", 10);
            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

            let records = calls.toArray();
            if (agentFilter) records = records.filter((r) => r.agent === agentFilter);
            records = records.slice(-limit);

            const cases = records
              .filter((r) => r.inputMessages?.length && r.outputText)
              .map((r) => ({
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
            return;
          }

          if (pathname.startsWith("/__ai/api/calls/") && req.method === "GET") {
            const rawCallId = pathname.slice("/__ai/api/calls/".length);
            const callId = rawCallId.slice(0, 100);
            const call = calls.toArray().find((c) => c.id === callId);
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
            return;
          }

          if (pathname === "/__ai/api/export") {
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
            res.end(
              JSON.stringify({
                exportedAt: new Date().toISOString(),
                agents: agentCount,
                tools: toolCount,
                totalCost,
                calls: calls.toArray(),
                toolCalls: toolCalls.toArray(),
                errors: errors.toArray(),
                costTrends: getCostTrends(),
                toolStats: getToolStats(),
                errorStats: getErrorStats(),
              }, null, 2)
            );
            return;
          }

          if (pathname === "/__ai/api") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(
              JSON.stringify({
                agents: agentCount,
                tools: toolCount,
                skills: skillCount,
                threads: threadCount,
                maxDelegationDepth,
                mcpExposed,
                calls: calls.toArray(),
                toolCalls: toolCalls.toArray(),
                totalCost,
                costTrends: getCostTrends(),
                toolStats: getToolStats(),
                errorStats: getErrorStats(),
              })
            );
            return;
          }

          if (pathname === "/__ai" || pathname === "/__ai/") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            applySecurityHeaders(res);
            res.end(generateDashboardHtml());
            return;
          }

          next();
        });
      };
    },
  };
}
