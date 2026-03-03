import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLongTermStore } from "../agents/memory/long-term-store";

describe("InMemoryLongTermStore", () => {
  let store: InMemoryLongTermStore;

  beforeEach(() => {
    store = new InMemoryLongTermStore();
  });

  it("set + get round-trip returns stored value", async () => {
    await store.set("ns1", "user-name", "Alice");
    const result = await store.get("ns1", "user-name");
    expect(result).toBe("Alice");
  });

  it("get on missing key returns null", async () => {
    const result = await store.get("ns1", "nonexistent");
    expect(result).toBeNull();
  });

  it("delete removes entry (get returns null after)", async () => {
    await store.set("ns1", "temp", "value");
    await store.delete("ns1", "temp");
    const result = await store.get("ns1", "temp");
    expect(result).toBeNull();
  });

  it("list returns all keys in namespace but not other namespaces", async () => {
    await store.set("ns1", "key-a", "val-a");
    await store.set("ns1", "key-b", "val-b");
    await store.set("ns2", "key-c", "val-c");

    const ns1Keys = await store.list("ns1");
    expect(ns1Keys).toHaveLength(2);
    expect(ns1Keys).toContain("key-a");
    expect(ns1Keys).toContain("key-b");

    const ns2Keys = await store.list("ns2");
    expect(ns2Keys).toHaveLength(1);
    expect(ns2Keys).toContain("key-c");
  });

  it("list returns empty array for namespace with no entries", async () => {
    const keys = await store.list("empty-ns");
    expect(keys).toEqual([]);
  });

  it("search exact match returns score 1.0", async () => {
    await store.set("ns1", "color", "blue");
    const results = await store.search("ns1", "blue");
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("color");
    expect(results[0].value).toBe("blue");
    expect(results[0].score).toBe(1.0);
  });

  it("search exact key match returns score 1.0", async () => {
    await store.set("ns1", "exactkey", "some value");
    const results = await store.search("ns1", "exactkey");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1.0);
  });

  it("search substring match returns score 0.5", async () => {
    await store.set("ns1", "greeting", "hello world");
    const results = await store.search("ns1", "hello");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.5);
  });

  it("search substring key match returns score 0.5", async () => {
    await store.set("ns1", "user-preference-color", "green");
    const results = await store.search("ns1", "preference");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.5);
  });

  it("search no match returns empty array", async () => {
    await store.set("ns1", "color", "blue");
    const results = await store.search("ns1", "zzznomatch");
    expect(results).toEqual([]);
  });

  it("search only searches within the given namespace", async () => {
    await store.set("ns1", "color", "blue");
    await store.set("ns2", "color", "red");
    const results = await store.search("ns2", "blue");
    expect(results).toEqual([]);
  });

  it("topK limits search results", async () => {
    await store.set("ns1", "a", "match content");
    await store.set("ns1", "b", "match content");
    await store.set("ns1", "c", "match content");
    await store.set("ns1", "d", "match content");
    await store.set("ns1", "e", "match content");

    const results = await store.search("ns1", "match", 3);
    expect(results).toHaveLength(3);
  });

  it("search results are sorted by score descending", async () => {
    await store.set("ns1", "exact", "query");          // exact value match → 1.0
    await store.set("ns1", "partial", "query in here"); // substring match → 0.5

    const results = await store.search("ns1", "query");
    expect(results[0].score).toBe(1.0);
    expect(results[1].score).toBe(0.5);
  });

  it("set overwrites existing value but preserves createdAt", async () => {
    await store.set("ns1", "key", "original");
    const firstResult = await store.get("ns1", "key");
    expect(firstResult).toBe("original");

    await store.set("ns1", "key", "updated");
    const secondResult = await store.get("ns1", "key");
    expect(secondResult).toBe("updated");
  });

  it("set supports optional metadata", async () => {
    await store.set("ns1", "user", "Alice", { role: "admin", age: 30 });
    const result = await store.get("ns1", "user");
    expect(result).toBe("Alice");
  });
});
