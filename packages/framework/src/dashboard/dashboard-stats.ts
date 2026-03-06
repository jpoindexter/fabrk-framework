import type { RingBuffer } from "./dashboard-state";
import type { CallRecord, ToolCallRecord, ErrorRecord } from "./dashboard-state";

export function getCostTrends(calls: RingBuffer<CallRecord>): Array<{ hour: string; cost: number; calls: number; byAgent: Record<string, number> }> {
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

export function getToolStats(toolCalls: RingBuffer<ToolCallRecord>): Array<{ tool: string; count: number; avgMs: number; agents: string[] }> {
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

export function getErrorStats(errors: RingBuffer<ErrorRecord>): { total: number; byAgent: Record<string, number>; recent: ErrorRecord[] } {
  const byAgent: Record<string, number> = {};
  for (const e of errors.toArray()) {
    byAgent[e.agent] = (byAgent[e.agent] ?? 0) + 1;
  }
  const all = errors.toArray();
  return { total: all.length, byAgent, recent: all.slice(-20).reverse() };
}
