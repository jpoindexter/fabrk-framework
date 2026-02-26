import { describe, it, expect, beforeEach } from "vitest";
import { checkBudget, recordCost } from "../agents/budget-guard.js";

// Budget guard uses module-level Maps, so we need fresh state per test.
// Since we can't reset the maps directly, we use unique agent/session names.

let counter = 0;
function unique(prefix: string) {
  return `${prefix}-${++counter}-${Date.now()}`;
}

describe("checkBudget", () => {
  it("returns null when no budget is configured", () => {
    const result = checkBudget("agent", "session");
    expect(result).toBeNull();
  });

  it("returns null when under daily budget", () => {
    const agent = unique("agent");
    const result = checkBudget(agent, "session", { daily: 10 });
    expect(result).toBeNull();
  });

  it("returns error when daily budget exceeded", () => {
    const agent = unique("agent");
    const session = unique("session");

    // Record $10 in costs
    recordCost(agent, session, 10);

    const result = checkBudget(agent, session, { daily: 10 });
    expect(result).toContain("Daily budget exceeded");
  });

  it("returns null when under per-session budget", () => {
    const agent = unique("agent");
    const session = unique("session");

    const result = checkBudget(agent, session, { perSession: 5 });
    expect(result).toBeNull();
  });

  it("returns error when per-session budget exceeded", () => {
    const agent = unique("agent");
    const session = unique("session");

    recordCost(agent, session, 5);

    const result = checkBudget(agent, session, { perSession: 5 });
    expect(result).toContain("Session budget exceeded");
  });
});

describe("recordCost", () => {
  it("accumulates daily costs for same agent", () => {
    const agent = unique("agent");
    const session = unique("session");

    recordCost(agent, session, 2);
    recordCost(agent, session, 3);

    // Should be at $5, so $4 daily budget should fail
    const result = checkBudget(agent, session, { daily: 4 });
    expect(result).toContain("Daily budget exceeded");
  });

  it("accumulates session costs across calls", () => {
    const agent = unique("agent");
    const session = unique("session");

    recordCost(agent, session, 1);
    recordCost(agent, session, 1);
    recordCost(agent, session, 1);

    // $3 total, so $2 session limit should fail
    const result = checkBudget(agent, session, { perSession: 2 });
    expect(result).toContain("Session budget exceeded");
  });

  it("tracks sessions independently", () => {
    const agent = unique("agent");
    const sessionA = unique("sessionA");
    const sessionB = unique("sessionB");

    recordCost(agent, sessionA, 5);

    // Session B should still be under budget
    const result = checkBudget(agent, sessionB, { perSession: 5 });
    expect(result).toBeNull();
  });
});
