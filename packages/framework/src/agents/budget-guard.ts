import type { AgentBudget } from "./define-agent.js";

/** In-memory daily cost accumulator per agent. Resets at midnight. */
const dailyCosts = new Map<string, { total: number; date: string }>();

/** In-memory per-session cost accumulator. */
const sessionCosts = new Map<string, number>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if the agent is within budget.
 * Returns null if allowed, or an error message if over budget.
 */
export function checkBudget(
  agentName: string,
  sessionId: string,
  budget?: AgentBudget
): string | null {
  if (!budget) return null;

  // Daily budget check
  if (budget.daily !== undefined) {
    const entry = dailyCosts.get(agentName);
    const currentDay = today();
    const spent = entry?.date === currentDay ? entry.total : 0;

    if (spent >= budget.daily) {
      return `Daily budget exceeded: $${spent.toFixed(4)} / $${budget.daily}`;
    }

    const threshold = budget.alertThreshold ?? 0.8;
    if (spent >= budget.daily * threshold) {
      console.warn(
        `[fabrk] Agent "${agentName}" at ${((spent / budget.daily) * 100).toFixed(0)}% of daily budget`
      );
    }
  }

  // Per-session budget check
  if (budget.perSession !== undefined) {
    const spent = sessionCosts.get(sessionId) ?? 0;
    if (spent >= budget.perSession) {
      return `Session budget exceeded: $${spent.toFixed(4)} / $${budget.perSession}`;
    }
  }

  return null;
}

/**
 * Record cost after a successful call.
 */
export function recordCost(
  agentName: string,
  sessionId: string,
  cost: number
): void {
  // Update daily
  const currentDay = today();
  const entry = dailyCosts.get(agentName);
  if (entry?.date === currentDay) {
    entry.total += cost;
  } else {
    dailyCosts.set(agentName, { total: cost, date: currentDay });
  }

  // Update session
  const sessionTotal = sessionCosts.get(sessionId) ?? 0;
  sessionCosts.set(sessionId, sessionTotal + cost);
}
