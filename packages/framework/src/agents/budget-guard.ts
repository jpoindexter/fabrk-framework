import type { AgentBudget } from "./define-agent";

const MAX_SESSIONS = 10_000;
const MAX_AGENTS = 1_000;
const MAX_USERS = 10_000;
const MAX_TENANTS = 1_000;

const dailyCosts = new Map<string, { total: number; date: string }>();
const sessionCosts = new Map<string, number>();
const userDailyCosts = new Map<string, { total: number; date: string }>();
const tenantDailyCosts = new Map<string, { total: number; date: string }>();

export interface BudgetContext {
  userId?: string;
  tenantId?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateBudgetValue(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`[fabrk] Invalid ${name} budget: ${value}`);
  }
}

function evictOldest<V>(map: Map<string, V>, cap: number, newKey: string): void {
  if (map.size >= cap && !map.has(newKey)) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

function checkDailyMap(
  map: Map<string, { total: number; date: string }>,
  key: string,
  limit: number,
  label: string
): string | null {
  const entry = map.get(key);
  const currentDay = today();
  const spent = entry?.date === currentDay ? entry.total : 0;
  if (spent >= limit) {
    return `${label} daily budget exceeded: $${spent.toFixed(4)} / $${limit}`;
  }
  return null;
}

export function checkBudget(
  agentName: string,
  sessionId: string,
  budget?: AgentBudget,
  ctx?: BudgetContext
): string | null {
  if (!budget) return null;

  if (budget.daily !== undefined) {
    validateBudgetValue("daily", budget.daily);
    const currentDay = today();
    const entry = dailyCosts.get(agentName);
    const spent = entry?.date === currentDay ? entry.total : 0;
    if (spent >= budget.daily) {
      return `Agent daily budget exceeded: $${spent.toFixed(4)} / $${budget.daily}`;
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

  if (budget.perUser !== undefined && ctx?.userId) {
    validateBudgetValue("perUser", budget.perUser);
    const err = checkDailyMap(userDailyCosts, ctx.userId, budget.perUser, "User");
    if (err) return err;
  }

  if (budget.perTenant !== undefined && ctx?.tenantId) {
    validateBudgetValue("perTenant", budget.perTenant);
    const err = checkDailyMap(tenantDailyCosts, ctx.tenantId, budget.perTenant, "Tenant");
    if (err) return err;
  }

  return null;
}

export function recordCost(
  agentName: string,
  sessionId: string,
  cost: number,
  ctx?: BudgetContext
): void {
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error(`[fabrk] Invalid cost value: ${cost}`);
  }
  const currentDay = today();

  const entry = dailyCosts.get(agentName);
  if (entry?.date === currentDay) {
    entry.total += cost;
  } else {
    evictOldest(dailyCosts, MAX_AGENTS, agentName);
    dailyCosts.set(agentName, { total: cost, date: currentDay });
  }

  evictOldest(sessionCosts, MAX_SESSIONS, sessionId);
  sessionCosts.set(sessionId, (sessionCosts.get(sessionId) ?? 0) + cost);

  if (ctx?.userId) {
    const userEntry = userDailyCosts.get(ctx.userId);
    if (userEntry?.date === currentDay) {
      userEntry.total += cost;
    } else {
      evictOldest(userDailyCosts, MAX_USERS, ctx.userId);
      userDailyCosts.set(ctx.userId, { total: cost, date: currentDay });
    }
  }

  if (ctx?.tenantId) {
    const tenantEntry = tenantDailyCosts.get(ctx.tenantId);
    if (tenantEntry?.date === currentDay) {
      tenantEntry.total += cost;
    } else {
      evictOldest(tenantDailyCosts, MAX_TENANTS, ctx.tenantId);
      tenantDailyCosts.set(ctx.tenantId, { total: cost, date: currentDay });
    }
  }
}
