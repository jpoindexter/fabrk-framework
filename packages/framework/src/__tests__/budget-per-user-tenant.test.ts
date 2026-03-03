import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkBudget, recordCost } from "../agents/budget-guard";

// Reset module-level maps between tests by reimporting fresh state
// We use vi.useFakeTimers to control the date

function makeAgentName() {
  return `agent-${Math.random().toString(36).slice(2)}`;
}
function makeSessionId() {
  return `session-${Math.random().toString(36).slice(2)}`;
}
function makeUserId() {
  return `user-${Math.random().toString(36).slice(2)}`;
}
function makeTenantId() {
  return `tenant-${Math.random().toString(36).slice(2)}`;
}

describe("per-user budget", () => {
  it("allows spend below perUser limit", () => {
    const agentName = makeAgentName();
    const sessionId = makeSessionId();
    const userId = makeUserId();
    const budget = { perUser: 1.0 };
    const ctx = { userId };
    recordCost(agentName, sessionId, 0.5, ctx);
    expect(checkBudget(agentName, makeSessionId(), budget, ctx)).toBeNull();
  });

  it("blocks when perUser daily limit exceeded", () => {
    const agentName = makeAgentName();
    const sessionId = makeSessionId();
    const userId = makeUserId();
    const budget = { perUser: 0.10 };
    const ctx = { userId };
    recordCost(agentName, sessionId, 0.11, ctx);
    const result = checkBudget(agentName, makeSessionId(), budget, ctx);
    expect(result).toMatch(/User daily budget exceeded/);
  });

  it("does not block when perUser is set but no userId in context", () => {
    const agentName = makeAgentName();
    const sessionId = makeSessionId();
    const budget = { perUser: 0.01 };
    recordCost(agentName, sessionId, 0.10);
    // No userId in context — perUser check is skipped
    expect(checkBudget(agentName, sessionId, budget, {})).toBeNull();
  });

  it("accumulates spend across multiple calls for same user", () => {
    const agentName = makeAgentName();
    const userId = makeUserId();
    const budget = { perUser: 0.25 };
    const ctx = { userId };
    recordCost(agentName, makeSessionId(), 0.10, ctx);
    recordCost(agentName, makeSessionId(), 0.10, ctx);
    recordCost(agentName, makeSessionId(), 0.10, ctx);
    const result = checkBudget(agentName, makeSessionId(), budget, ctx);
    expect(result).toMatch(/User daily budget exceeded/);
  });

  it("tracks users independently", () => {
    const agentName = makeAgentName();
    const userId1 = makeUserId();
    const userId2 = makeUserId();
    const budget = { perUser: 0.20 };
    recordCost(agentName, makeSessionId(), 0.15, { userId: userId1 });
    // userId2 has 0 spend — should not be blocked
    expect(checkBudget(agentName, makeSessionId(), budget, { userId: userId2 })).toBeNull();
  });
});

describe("per-tenant budget", () => {
  it("allows spend below perTenant limit", () => {
    const agentName = makeAgentName();
    const tenantId = makeTenantId();
    const budget = { perTenant: 5.0 };
    const ctx = { tenantId };
    recordCost(agentName, makeSessionId(), 2.0, ctx);
    expect(checkBudget(agentName, makeSessionId(), budget, ctx)).toBeNull();
  });

  it("blocks when perTenant daily limit exceeded", () => {
    const agentName = makeAgentName();
    const tenantId = makeTenantId();
    const budget = { perTenant: 1.0 };
    const ctx = { tenantId };
    recordCost(agentName, makeSessionId(), 0.60, ctx);
    recordCost(agentName, makeSessionId(), 0.60, ctx);
    const result = checkBudget(agentName, makeSessionId(), budget, ctx);
    expect(result).toMatch(/Tenant daily budget exceeded/);
  });

  it("does not block when perTenant is set but no tenantId in context", () => {
    const agentName = makeAgentName();
    const budget = { perTenant: 0.01 };
    recordCost(agentName, makeSessionId(), 1.0);
    expect(checkBudget(agentName, makeSessionId(), budget, {})).toBeNull();
  });

  it("accumulates across agents in same tenant", () => {
    const agent1 = makeAgentName();
    const agent2 = makeAgentName();
    const tenantId = makeTenantId();
    const budget = { perTenant: 0.30 };
    const ctx = { tenantId };
    recordCost(agent1, makeSessionId(), 0.20, ctx);
    recordCost(agent2, makeSessionId(), 0.20, ctx);
    const result = checkBudget(agent1, makeSessionId(), budget, ctx);
    expect(result).toMatch(/Tenant daily budget exceeded/);
  });
});

describe("combined user + tenant budget", () => {
  it("blocks on tenant limit even when user is under limit", () => {
    const agentName = makeAgentName();
    const userId = makeUserId();
    const tenantId = makeTenantId();
    const budget = { perUser: 1.0, perTenant: 0.15 };
    const ctx = { userId, tenantId };
    recordCost(agentName, makeSessionId(), 0.10, ctx);
    recordCost(agentName, makeSessionId(), 0.10, ctx);
    const result = checkBudget(agentName, makeSessionId(), budget, ctx);
    expect(result).toMatch(/Tenant daily budget exceeded/);
  });

  it("blocks on user limit even when tenant is under limit", () => {
    const agentName = makeAgentName();
    const userId = makeUserId();
    const tenantId = makeTenantId();
    const budget = { perUser: 0.15, perTenant: 1.0 };
    const ctx = { userId, tenantId };
    recordCost(agentName, makeSessionId(), 0.20, ctx);
    const result = checkBudget(agentName, makeSessionId(), budget, ctx);
    expect(result).toMatch(/User daily budget exceeded/);
  });
});

describe("backward compatibility", () => {
  it("checkBudget without ctx still works", () => {
    const agentName = makeAgentName();
    const sessionId = makeSessionId();
    const budget = { daily: 100, perSession: 10 };
    recordCost(agentName, sessionId, 5.0);
    expect(checkBudget(agentName, sessionId, budget)).toBeNull();
  });

  it("recordCost without ctx still works", () => {
    const agentName = makeAgentName();
    const sessionId = makeSessionId();
    expect(() => recordCost(agentName, sessionId, 0.01)).not.toThrow();
  });
});
