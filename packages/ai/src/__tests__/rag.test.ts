import { describe, it, expect, beforeEach } from "vitest";
import { chunkText } from "../rag/chunk";
import { InMemoryVectorStore } from "../rag/vector-store";

describe("chunkText", () => {
  it("returns [] for empty string", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk when text <= size", () => {
    const text = "short text";
    const chunks = chunkText(text, { size: 512 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].end).toBe(text.length);
  });

  it("splits into multiple chunks with correct overlap", () => {
    const text = "a".repeat(200);
    const chunks = chunkText(text, { size: 100, overlap: 20, separator: "||" });
    expect(chunks.length).toBeGreaterThan(1);
    const first = chunks[0];
    const second = chunks[1];
    expect(first.end - second.start).toBeGreaterThanOrEqual(0);
  });

  it("chunk indices are sequential 0,1,2...", () => {
    const text = "word ".repeat(200);
    const chunks = chunkText(text, { size: 50, overlap: 10 });
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("prefers separator boundary when available", () => {
    const part1 = "a".repeat(200);
    const part2 = "b".repeat(200);
    const text = part1 + "\n\n" + part2;
    const chunks = chunkText(text, { size: 300, overlap: 20, separator: "\n\n" });
    expect(chunks.length).toBeGreaterThan(1);
    const firstText = chunks[0].text;
    expect(firstText).toContain("a");
  });

  it("no infinite loop on text with no separators", () => {
    const text = "x".repeat(300);
    const chunks = chunkText(text, { size: 100, overlap: 20, separator: "\n\n" });
    expect(chunks.length).toBeGreaterThan(1);
    const totalCoverage = chunks.reduce((sum, c) => sum + (c.end - c.start), 0);
    expect(totalCoverage).toBeGreaterThanOrEqual(text.length);
  });

  it("respects custom size and overlap options", () => {
    const text = "hello world ".repeat(50);
    const chunks = chunkText(text, { size: 30, overlap: 5 });
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(30 + 5);
    }
  });
});

describe("InMemoryVectorStore", () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it("starts with size 0", () => {
    expect(store.size).toBe(0);
  });

  it("add() increases size", () => {
    store.add({ id: "a", vector: [1, 0], text: "doc a" });
    expect(store.size).toBe(1);
    store.add({ id: "b", vector: [0, 1], text: "doc b" });
    expect(store.size).toBe(2);
  });

  it("search() returns empty array when store is empty", () => {
    expect(store.search([1, 0])).toEqual([]);
  });

  it("search() returns results ordered by cosine similarity desc", () => {
    store.add({ id: "x", vector: [1, 0], text: "x" });
    store.add({ id: "y", vector: [0, 1], text: "y" });
    store.add({ id: "z", vector: [1, 1], text: "z" });

    const results = store.search([1, 0], { topK: 3 });
    expect(results[0].id).toBe("x");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("search() respects topK option", () => {
    store.add([
      { id: "a", vector: [1, 0], text: "a" },
      { id: "b", vector: [0, 1], text: "b" },
      { id: "c", vector: [1, 1], text: "c" },
    ]);
    const results = store.search([1, 0], { topK: 2 });
    expect(results).toHaveLength(2);
  });

  it("search() respects minScore option — filters results below threshold", () => {
    store.add({ id: "match", vector: [1, 0], text: "match" });
    store.add({ id: "nomatch", vector: [0, 1], text: "nomatch" });

    const results = store.search([1, 0], { minScore: 0.9 });
    expect(results.every((r) => r.score >= 0.9)).toBe(true);
    expect(results.some((r) => r.id === "match")).toBe(true);
    expect(results.some((r) => r.id === "nomatch")).toBe(false);
  });

  it("add() upserts — replacing existing entry by id", () => {
    store.add({ id: "a", vector: [1, 0], text: "original" });
    store.add({ id: "a", vector: [0, 1], text: "updated" });
    expect(store.size).toBe(1);
    const results = store.search([0, 1], { topK: 1 });
    expect(results[0].text).toBe("updated");
  });

  it("delete() removes entry, returns true; returns false for unknown id", () => {
    store.add({ id: "a", vector: [1, 0], text: "a" });
    expect(store.delete("a")).toBe(true);
    expect(store.size).toBe(0);
    expect(store.delete("nonexistent")).toBe(false);
  });

  it("clear() removes all entries", () => {
    store.add([
      { id: "a", vector: [1, 0], text: "a" },
      { id: "b", vector: [0, 1], text: "b" },
    ]);
    store.clear();
    expect(store.size).toBe(0);
    expect(store.search([1, 0])).toEqual([]);
  });
});
