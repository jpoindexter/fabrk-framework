import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryCheckpointStore,
  type CheckpointState,
} from "../agents/checkpoint";
import {
  pendingApprovals,
  getAgentApprovals,
  handleListApprovals,
} from "../agents/approval-handler";

function makeState(overrides: Partial<CheckpointState> = {}): CheckpointState {
  return {
    id: overrides.id ?? "cp-1",
    agentName: "test-agent",
    messages: [{ role: "user", content: "Hello" }],
    iteration: 0,
    toolResults: [],
    status: "running",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("CheckpointState pendingApproval field", () => {
  it("can construct a valid CheckpointState with pendingApproval set", () => {
    const state: CheckpointState = makeState({
      pendingApproval: {
        approvalId: "appr-123",
        toolName: "dangerousTool",
        input: { file: "/etc/passwd" },
        expiresAt: Date.now() + 60_000,
      },
    });
    expect(state.pendingApproval).toBeDefined();
    expect(state.pendingApproval!.approvalId).toBe("appr-123");
    expect(state.pendingApproval!.toolName).toBe("dangerousTool");
    expect(state.pendingApproval!.input).toEqual({ file: "/etc/passwd" });
    expect(state.pendingApproval!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("pendingApproval is optional — CheckpointState without it is valid", () => {
    const state: CheckpointState = makeState();
    expect(state.pendingApproval).toBeUndefined();
  });

  it("checkpoint status set to 'paused' when pendingApproval is present", () => {
    const state: CheckpointState = makeState({
      status: "paused",
      pendingApproval: {
        approvalId: "appr-456",
        toolName: "myTool",
        input: {},
      },
    });
    expect(state.status).toBe("paused");
    expect(state.pendingApproval).toBeDefined();
  });

  it("after clearing pendingApproval, status can be set back to 'running'", () => {
    let state: CheckpointState = makeState({
      status: "paused",
      pendingApproval: {
        approvalId: "appr-789",
        toolName: "myTool",
        input: {},
      },
    });
    // Simulate resolution — clear pendingApproval, restore running
    state = { ...state, pendingApproval: undefined, status: "running" };
    expect(state.status).toBe("running");
    expect(state.pendingApproval).toBeUndefined();
  });

  it("pendingApproval without expiresAt is also valid", () => {
    const state: CheckpointState = makeState({
      pendingApproval: {
        approvalId: "no-expiry",
        toolName: "myTool",
        input: { key: "value" },
        // no expiresAt
      },
    });
    expect(state.pendingApproval!.expiresAt).toBeUndefined();
  });
});

describe("CheckpointStore — pendingApproval persistence", () => {
  it("saved checkpoint with pendingApproval can be loaded back with field intact", async () => {
    const store = new InMemoryCheckpointStore();
    const expiresAt = Date.now() + 30_000;
    const state = makeState({
      id: "cp-pa-1",
      status: "paused",
      pendingApproval: {
        approvalId: "appr-aaa",
        toolName: "writeTool",
        input: { path: "/tmp/out.txt", content: "hello" },
        expiresAt,
      },
    });

    await store.save("cp-pa-1", state);
    const loaded = await store.load("cp-pa-1");

    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe("paused");
    expect(loaded!.pendingApproval).toBeDefined();
    expect(loaded!.pendingApproval!.approvalId).toBe("appr-aaa");
    expect(loaded!.pendingApproval!.toolName).toBe("writeTool");
    expect(loaded!.pendingApproval!.input).toEqual({ path: "/tmp/out.txt", content: "hello" });
    expect(loaded!.pendingApproval!.expiresAt).toBe(expiresAt);
  });

  it("saving without pendingApproval then with it persists the update", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-pa-2", makeState({ id: "cp-pa-2" }));

    let loaded = await store.load("cp-pa-2");
    expect(loaded!.pendingApproval).toBeUndefined();

    // Now add pendingApproval by saving updated state
    await store.save("cp-pa-2", {
      ...loaded!,
      status: "paused",
      pendingApproval: {
        approvalId: "appr-bbb",
        toolName: "deleteTool",
        input: { path: "/important" },
      },
    });

    loaded = await store.load("cp-pa-2");
    expect(loaded!.status).toBe("paused");
    expect(loaded!.pendingApproval!.approvalId).toBe("appr-bbb");
  });

  it("clearing pendingApproval in store update removes the field on reload", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-pa-3", makeState({
      id: "cp-pa-3",
      status: "paused",
      pendingApproval: {
        approvalId: "appr-ccc",
        toolName: "myTool",
        input: {},
      },
    }));

    // Resolve: clear pendingApproval
    const current = await store.load("cp-pa-3");
    await store.save("cp-pa-3", { ...current!, pendingApproval: undefined, status: "running" });

    const loaded = await store.load("cp-pa-3");
    expect(loaded!.status).toBe("running");
    expect(loaded!.pendingApproval).toBeUndefined();
  });

  it("pendingApproval survives listHistory round-trip via append", async () => {
    const store = new InMemoryCheckpointStore();
    const stateWithApproval = makeState({
      id: "cp-pa-4",
      agentName: "agent-appr",
      iteration: 5,
      status: "paused",
      pendingApproval: {
        approvalId: "appr-ddd",
        toolName: "myTool",
        input: { x: 1 },
      },
    });
    await store.append(stateWithApproval);

    const history = await store.listHistory("agent-appr", "cp-pa-4");
    expect(history).toHaveLength(1);
    expect(history[0].pendingApproval!.approvalId).toBe("appr-ddd");
  });
});

describe("GET /__ai/agents/:name/approvals — handleListApprovals", () => {
  beforeEach(() => {
    // Clear module-level state between tests
    pendingApprovals.clear();
  });

  it("returns empty array when no pending approvals for agent", () => {
    const resp = handleListApprovals("unknown-agent");
    expect(resp.status).toBe(200);
  });

  it("returns empty array as JSON body when no approvals", async () => {
    const resp = handleListApprovals("empty-agent");
    const body = await resp.json() as Array<{ approvalId: string; toolName: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns pending approvals for the given agent", async () => {
    const agentName = "list-agent";
    const agentMap = getAgentApprovals(agentName);
    agentMap.set("appr-list-1", {
      resolve: () => {},
      toolName: "toolA",
    });
    agentMap.set("appr-list-2", {
      resolve: () => {},
      toolName: "toolB",
    });

    const resp = handleListApprovals(agentName);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Array<{ approvalId: string; toolName: string }>;
    expect(body).toHaveLength(2);
    const ids = body.map((a) => a.approvalId).sort();
    expect(ids).toEqual(["appr-list-1", "appr-list-2"].sort());
    const toolNames = body.map((a) => a.toolName).sort();
    expect(toolNames).toContain("toolA");
    expect(toolNames).toContain("toolB");
  });

  it("does not include approvals for other agents", async () => {
    const agentA = getAgentApprovals("agent-A");
    agentA.set("appr-A", { resolve: () => {}, toolName: "toolX" });

    const agentB = getAgentApprovals("agent-B");
    agentB.set("appr-B", { resolve: () => {}, toolName: "toolY" });

    const respA = handleListApprovals("agent-A");
    const bodyA = await respA.json() as Array<{ approvalId: string }>;
    expect(bodyA.map((a) => a.approvalId)).toEqual(["appr-A"]);

    const respB = handleListApprovals("agent-B");
    const bodyB = await respB.json() as Array<{ approvalId: string }>;
    expect(bodyB.map((a) => a.approvalId)).toEqual(["appr-B"]);
  });

  it("response includes security headers", () => {
    const resp = handleListApprovals("sec-agent");
    expect(resp.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
