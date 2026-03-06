import { getCostTrends, getToolStats, getErrorStats } from "./dashboard-stats";

/** Fixed-capacity ring buffer — O(1) insert, O(N) snapshot. */
export class RingBuffer<T> {
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

export interface CallRecord {
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

export interface ToolCallRecord {
  timestamp: number;
  agent: string;
  tool: string;
  durationMs: number;
  iteration: number;
}

export interface ErrorRecord {
  timestamp: number;
  agent: string;
  error: string;
}

export interface DashboardState {
  calls: RingBuffer<CallRecord>;
  toolCalls: RingBuffer<ToolCallRecord>;
  errors: RingBuffer<ErrorRecord>;
  totalCost: number;
  agentCount: number;
  toolCount: number;
  skillCount: number;
  threadCount: number;
  maxDelegationDepth: number;
  mcpExposed: boolean;
  getExportData: () => Record<string, unknown>;
  getSummaryData: () => Record<string, unknown>;
}

export function createDashboardState(): DashboardState {
  const calls = new RingBuffer<CallRecord>(100);
  const toolCalls = new RingBuffer<ToolCallRecord>(200);
  const errors = new RingBuffer<ErrorRecord>(100);

  const state: DashboardState = {
    calls,
    toolCalls,
    errors,
    totalCost: 0,
    agentCount: 0,
    toolCount: 0,
    skillCount: 0,
    threadCount: 0,
    maxDelegationDepth: 0,
    mcpExposed: false,
    getExportData: () => ({
      exportedAt: new Date().toISOString(),
      agents: state.agentCount,
      tools: state.toolCount,
      totalCost: state.totalCost,
      calls: calls.toArray(),
      toolCalls: toolCalls.toArray(),
      errors: errors.toArray(),
      costTrends: getCostTrends(calls),
      toolStats: getToolStats(toolCalls),
      errorStats: getErrorStats(errors),
    }),
    getSummaryData: () => ({
      agents: state.agentCount,
      tools: state.toolCount,
      skills: state.skillCount,
      threads: state.threadCount,
      maxDelegationDepth: state.maxDelegationDepth,
      mcpExposed: state.mcpExposed,
      calls: calls.toArray(),
      toolCalls: toolCalls.toArray(),
      totalCost: state.totalCost,
      costTrends: getCostTrends(calls),
      toolStats: getToolStats(toolCalls),
      errorStats: getErrorStats(errors),
    }),
  };

  return state;
}
