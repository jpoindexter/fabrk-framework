import { describe, it, expect } from "vitest";
import {
  InMemoryCheckpointStore,
  generateCheckpointId,
  type CheckpointState,
} from "../agents/checkpoint";

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

describe("InMemoryCheckpointStore", () => {
  it("save and load round-trip", async () => {
    const store = new InMemoryCheckpointStore();
    const state = makeState();
    await store.save("cp-1", state);
    const loaded = await store.load("cp-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.agentName).toBe("test-agent");
    expect(loaded!.status).toBe("running");
  });

  it("returns null for unknown ID", async () => {
    const store = new InMemoryCheckpointStore();
    const loaded = await store.load("nonexistent");
    expect(loaded).toBeNull();
  });

  it("delete removes checkpoint", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-1", makeState());
    await store.delete("cp-1");
    const loaded = await store.load("cp-1");
    expect(loaded).toBeNull();
  });

  it("overwrite updates existing checkpoint", async () => {
    const store = new InMemoryCheckpointStore();
    await store.save("cp-1", makeState({ status: "running" }));
    await store.save("cp-1", makeState({ status: "completed" }));
    const loaded = await store.load("cp-1");
    expect(loaded!.status).toBe("completed");
    expect(store.size).toBe(1);
  });

  it("updates updatedAt on save", async () => {
    const store = new InMemoryCheckpointStore();
    const state = makeState({ updatedAt: 1000 });
    await store.save("cp-1", state);
    const loaded = await store.load("cp-1");
    expect(loaded!.updatedAt).toBeGreaterThan(1000);
  });

  it("evicts oldest entry when at capacity", async () => {
    const store = new InMemoryCheckpointStore();
    // Fill to capacity (1000)
    for (let i = 0; i < 1000; i++) {
      await store.save(`cp-${i}`, makeState({ id: `cp-${i}` }));
    }
    expect(store.size).toBe(1000);

    // Adding one more should evict the oldest (cp-0)
    await store.save("cp-new", makeState({ id: "cp-new" }));
    expect(store.size).toBe(1000);
    const oldest = await store.load("cp-0");
    expect(oldest).toBeNull();
    const newest = await store.load("cp-new");
    expect(newest).not.toBeNull();
  });

  it("preserves messages and toolResults", async () => {
    const store = new InMemoryCheckpointStore();
    const state = makeState({
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
      ],
      toolResults: [{ name: "search", output: "found it" }],
    });
    await store.save("cp-1", state);
    const loaded = await store.load("cp-1");
    expect(loaded!.messages).toHaveLength(2);
    expect(loaded!.toolResults).toHaveLength(1);
    expect(loaded!.toolResults[0].name).toBe("search");
  });
});

describe("generateCheckpointId", () => {
  it("returns a non-empty string", () => {
    const id = generateCheckpointId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCheckpointId()));
    expect(ids.size).toBe(100);
  });
});
