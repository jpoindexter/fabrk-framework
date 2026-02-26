import type { AgentBudget } from "./define-agent";

const MAX_SESSIONS = 10_000;
const MAX_AGENTS = 1_000;

const dailyCosts = new Map<string, { total: number; date: string }>();
const sessionCosts = new Map<string, number>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateBudgetValue(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`[fabrk] Invalid ${name} budget: ${value}`);
  }
}

export function checkBudget(
  agentName: string,
  sessionId: string,
  budget?: AgentBudget
): string | null {
  if (!budget) return null;

  if (budget.daily !== undefined) {
    validateBudgetValue("daily", budget.daily);
    const entry = dailyCosts.get(agentName);
    const currentDay = today();
    const spent = entry?.date === currentDay ? entry.total : 0;

    if (spent >= budget.daily) {
      return `Daily budget exceeded: $${spent.toFixed(4)} / $${budget.daily}`;
    }

    const threshold = budget.alertThreshold ?? 0.8;
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new Error(`[fabrk] Invalid alertThreshold: ${threshold}`);
    }
    if (spent >= budget.daily * threshold) {
      console.warn(
        `[fabrk] Agent "${agentName}" at ${((spent / budget.daily) * 100).toFixed(0)}% of daily budget`
      );
    }
  }

  if (budget.perSession !== undefined) {
    validateBudgetValue("perSession", budget.perSession);
    const spent = sessionCosts.get(sessionId) ?? 0;
    if (spent >= budget.perSession) {
      return `Session budget exceeded: $${spent.toFixed(4)} / $${budget.perSession}`;
    }
  }

  return null;
}

export function recordCost(
  agentName: string,
  sessionId: string,
  cost: number
): void {
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error(`[fabrk] Invalid cost value: ${cost}`);
  }
  const currentDay = today();
  const entry = dailyCosts.get(agentName);
  if (entry?.date === currentDay) {
    entry.total += cost;
  } else {
    if (dailyCosts.size >= MAX_AGENTS && !dailyCosts.has(agentName)) {
      const oldest = dailyCosts.keys().next().value;
      if (oldest !== undefined) dailyCosts.delete(oldest);
    }
    dailyCosts.set(agentName, { total: cost, date: currentDay });
  }

  if (sessionCosts.size >= MAX_SESSIONS && !sessionCosts.has(sessionId)) {
    const oldest = sessionCosts.keys().next().value;
    if (oldest !== undefined) sessionCosts.delete(oldest);
  }

  const sessionTotal = sessionCosts.get(sessionId) ?? 0;
  sessionCosts.set(sessionId, sessionTotal + cost);
}
