import { describe, it, expect } from "vitest";
import {
  InMemoryCheckpointStore,
  type CheckpointState,
} from "../agents/checkpoint";

function makeState(overrides: Partial<CheckpointState> = {}): CheckpointState {
  return {
    id: overrides.id ?? "cp-1",
    agentName: overrides.agentName ?? "test-agent",
    messages: [{ role: "user", content: "Hello" }],
    iteration: overrides.iteration ?? 0,
    toolResults: [],
    status: "running",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("InMemoryCheckpointStore — history", () => {
  it("save writes to current store AND history", async () => {
    const store = new InMemoryCheckpointStore();
    const state = makeState({ id: "cp-1", agentName: "agent-a", iteration: 0 });
    await store.save("cp-1", state);

    // Current store has the checkpoint
    const loaded = await store.load("cp-1");
    expect(loaded).not.toBeNull();

    // History also has it
    const history = await store.listHistory("agent-a", "cp-1");
    expect(history).toHaveLength(1);
    expect(history[0].iteration).toBe(0);
  });

  it("append writes to history only and does NOT overwrite current", async () => {
    const store = new InMemoryCheckpointStore();
    const state = makeState({ id: "cp-2", agentName: "agent-b", iteration: 1 });
    await store.save("cp-2", makeState({ id: "cp-2", agentName: "agent-b", iteration: 0 }));

    // append should NOT change current
    await store.append(state);

    const current = await store.load("cp-2");
    expect(current!.iteration).toBe(0); // still the original

    // History should include both
    const history = await store.listHistory("agent-b", "cp-2");
    expect(history.length).toBeGreaterThanOrEqual(2);
    const iterations = history.map((h) => h.iteration);
    expect(iterations).toContain(0);
    expect(iterations).toContain(1);
  });

  it("listHistory returns all iterations sorted ascending", async () => {
    const store = new InMemoryCheckpointStore();
    // Save iterations out of order
    await store.save("cp-3", makeState({ id: "cp-3", agentName: "agent-c", iteration: 0 }));
    await store.append(makeState({ id: "cp-3", agentName: "agent-c", iteration: 3 }));
    await store.append(makeState({ id: "cp-3", agentName: "agent-c", iteration: 1 }));
    await store.append(makeState({ id: "cp-3", agentName: "agent-c", iteration: 2 }));

    const history = await store.listHistory("agent-c", "cp-3");
    const iterations = history.map((h) => h.iteration);
    expect(iterations).toEqual([0, 1, 2, 3]);
  });

  it("rollback to a valid iteration restores it as current", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-4", makeState({ id: "cp-4", agentName: "agent-d", iteration: 0 }));
    await store.save("cp-4", makeState({ id: "cp-4", agentName: "agent-d", iteration: 1 }));
    await store.save("cp-4", makeState({ id: "cp-4", agentName: "agent-d", iteration: 2 }));

    const restored = await store.rollback("agent-d", "cp-4", 1);
    expect(restored.iteration).toBe(1);

    const current = await store.load("cp-4");
    expect(current!.iteration).toBe(1);
  });

  it("rollback to an unknown iteration throws an error", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-5", makeState({ id: "cp-5", agentName: "agent-e", iteration: 0 }));

    await expect(
      store.rollback("agent-e", "cp-5", 99)
    ).rejects.toThrow("Checkpoint iteration 99 not found for agent-e:cp-5");
  });

  it("history is capped at 100 entries per session (101st evicts oldest)", async () => {
    const store = new InMemoryCheckpointStore();
    // Save 100 entries via save (which also pushes to history)
    for (let i = 0; i < 100; i++) {
      await store.append(makeState({ id: "sess-cap", agentName: "agent-f", iteration: i }));
    }

    let history = await store.listHistory("agent-f", "sess-cap");
    expect(history).toHaveLength(100);

    // 101st entry should evict the oldest (iteration 0)
    await store.append(makeState({ id: "sess-cap", agentName: "agent-f", iteration: 100 }));
    history = await store.listHistory("agent-f", "sess-cap");
    expect(history).toHaveLength(100);
    const iterations = history.map((h) => h.iteration);
    expect(iterations).not.toContain(0);
    expect(iterations).toContain(100);
  });

  it("load after rollback returns the rolled-back state", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-6", makeState({ id: "cp-6", agentName: "agent-g", iteration: 0, status: "running" }));
    await store.save("cp-6", makeState({ id: "cp-6", agentName: "agent-g", iteration: 1, status: "running" }));
    await store.save("cp-6", makeState({ id: "cp-6", agentName: "agent-g", iteration: 2, status: "completed" }));

    await store.rollback("agent-g", "cp-6", 1);

    const loaded = await store.load("cp-6");
    expect(loaded).not.toBeNull();
    expect(loaded!.iteration).toBe(1);
    expect(loaded!.status).toBe("running");
  });

  it("listHistory returns empty array for unknown session", async () => {
    const store = new InMemoryCheckpointStore();
    const history = await store.listHistory("nobody", "no-session");
    expect(history).toEqual([]);
  });
});

describe("handleAgentHistory and handleAgentRollback", () => {
  it("handleAgentHistory returns JSON array of checkpoints", async () => {
    const { handleAgentHistory } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    await store.save("cp-h1", makeState({ id: "cp-h1", agentName: "hist-agent", iteration: 0 }));
    await store.append(makeState({ id: "cp-h1", agentName: "hist-agent", iteration: 1 }));

    const resp = await handleAgentHistory("hist-agent", "cp-h1", store, "127.0.0.1");
    expect(resp.status).toBe(200);
    const body = await resp.json() as CheckpointState[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body[0].iteration).toBeLessThanOrEqual(body[1].iteration);
  });

  it("handleAgentHistory returns empty array for unknown session", async () => {
    const { handleAgentHistory } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentHistory("nobody", "no-session", store, "127.0.0.1");
    expect(resp.status).toBe(200);
    const body = await resp.json() as CheckpointState[];
    expect(body).toEqual([]);
  });

  it("handleAgentHistory returns 403 for non-localhost remoteAddress", async () => {
    const { handleAgentHistory } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentHistory("nobody", "no-session", store, "192.168.1.10");
    expect(resp.status).toBe(403);
  });

  it("handleAgentHistory returns 403 when remoteAddress is absent (fail-closed)", async () => {
    const { handleAgentHistory } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentHistory("nobody", "no-session", store);
    expect(resp.status).toBe(403);
  });

  it("handleAgentRollback returns 400 for invalid JSON", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: "not json",
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(400);
    const body = await resp.json() as { error: string };
    expect(body.error).toContain("Invalid JSON");
  });

  it("handleAgentRollback returns 400 for missing fields", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1" }), // missing targetIteration
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(400);
  });

  it("handleAgentRollback returns 404 for unknown iteration", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "cp-x", targetIteration: 42 }),
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(404);
  });

  it("handleAgentRollback returns 200 and restored state for valid rollback", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    await store.save("cp-rb", makeState({ id: "cp-rb", agentName: "rb-agent", iteration: 0 }));
    await store.save("cp-rb", makeState({ id: "cp-rb", agentName: "rb-agent", iteration: 1 }));

    const req = new Request("http://localhost/__ai/agents/rb-agent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "cp-rb", targetIteration: 0 }),
    });
    const resp = await handleAgentRollback("rb-agent", req, store, "127.0.0.1");
    expect(resp.status).toBe(200);
    const body = await resp.json() as CheckpointState;
    expect(body.iteration).toBe(0);
  });

  it("handleAgentHistory response includes security headers", async () => {
    const { handleAgentHistory } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const resp = await handleAgentHistory("nobody", "no-session", store, "127.0.0.1");
    expect(resp.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("handleAgentRollback response includes security headers", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/agent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "no-sess", targetIteration: 0 }),
    });
    const resp = await handleAgentRollback("agent", req, store, "127.0.0.1");
    expect(resp.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("handleAgentRollback returns 400 for negative targetIteration", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", targetIteration: -1 }),
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(400);
  });

  it("handleAgentRollback returns 400 for targetIteration >= 10000", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", targetIteration: 10000 }),
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(400);
  });

  it("handleAgentRollback returns 400 for non-integer targetIteration", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", targetIteration: 1.5 }),
    });
    const resp = await handleAgentRollback("myAgent", req, store, "127.0.0.1");
    expect(resp.status).toBe(400);
  });

  it("handleAgentRollback returns 403 for non-localhost remoteAddress", async () => {
    const { handleAgentRollback } = await import("../agents/durable-handler");
    const store = new InMemoryCheckpointStore();
    const req = new Request("http://localhost/__ai/agents/myAgent/rollback", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", targetIteration: 0 }),
    });
    const resp = await handleAgentRollback("myAgent", req, store, "192.168.1.10");
    expect(resp.status).toBe(403);
  });
});
