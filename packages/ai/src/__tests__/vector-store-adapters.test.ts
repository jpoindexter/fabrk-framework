import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryVectorStoreAdapter } from "../rag/adapters";

describe("InMemoryVectorStoreAdapter", () => {
  let adapter: InMemoryVectorStoreAdapter;

  beforeEach(() => {
    adapter = new InMemoryVectorStoreAdapter();
  });

  it("add() single entry", async () => {
    await adapter.add({ id: "a", vector: [1, 0], text: "doc a" });
    const results = await adapter.search([1, 0], { topK: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a");
  });

  it("add() array of entries", async () => {
    await adapter.add([
      { id: "a", vector: [1, 0], text: "a" },
      { id: "b", vector: [0, 1], text: "b" },
    ]);
    const results = await adapter.search([1, 0], { topK: 5 });
    expect(results).toHaveLength(2);
  });

  it("search() returns results ordered by score desc", async () => {
    await adapter.add([
      { id: "x", vector: [1, 0], text: "x" },
      { id: "y", vector: [0, 1], text: "y" },
      { id: "z", vector: [1, 1], text: "z" },
    ]);
    const results = await adapter.search([1, 0], { topK: 3 });
    expect(results[0].id).toBe("x");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("search() respects topK", async () => {
    await adapter.add([
      { id: "a", vector: [1, 0], text: "a" },
      { id: "b", vector: [0, 1], text: "b" },
      { id: "c", vector: [1, 1], text: "c" },
    ]);
    const results = await adapter.search([1, 0], { topK: 2 });
    expect(results).toHaveLength(2);
  });

  it("search() respects minScore", async () => {
    await adapter.add([
      { id: "match", vector: [1, 0], text: "match" },
      { id: "nomatch", vector: [0, 1], text: "nomatch" },
    ]);
    const results = await adapter.search([1, 0], { minScore: 0.9 });
    expect(results.every((r) => r.score >= 0.9)).toBe(true);
    expect(results.some((r) => r.id === "match")).toBe(true);
    expect(results.some((r) => r.id === "nomatch")).toBe(false);
  });

  it("delete() removes entry, returns true; false for unknown", async () => {
    await adapter.add({ id: "a", vector: [1, 0], text: "a" });
    expect(await adapter.delete("a")).toBe(true);
    expect(await adapter.delete("nonexistent")).toBe(false);
    const results = await adapter.search([1, 0]);
    expect(results).toHaveLength(0);
  });

  it("clear() removes all entries", async () => {
    await adapter.add([
      { id: "a", vector: [1, 0], text: "a" },
      { id: "b", vector: [0, 1], text: "b" },
    ]);
    await adapter.clear();
    const results = await adapter.search([1, 0]);
    expect(results).toHaveLength(0);
  });
});
