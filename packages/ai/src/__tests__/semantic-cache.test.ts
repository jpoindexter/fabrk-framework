import { describe, it, expect, beforeEach, vi } from "vitest";
import { SemanticCache } from "../cache/semantic-cache";
import type { EmbeddingProvider } from "../embeddings/types";

function makeEmbedder(vectors: Map<string, number[]>): EmbeddingProvider {
  return {
    embed: vi.fn(async (text: string) => {
      const v = vectors.get(text);
      if (!v) throw new Error(`No vector for: ${text}`);
      return v;
    }),
    embedBatch: vi.fn(async (texts: string[]) =>
      texts.map((t) => {
        const v = vectors.get(t);
        if (!v) throw new Error(`No vector for: ${t}`);
        return v;
      }),
    ),
  };
}

describe("SemanticCache", () => {
  it("miss returns null", async () => {
    const embedder = makeEmbedder(new Map([["hello", [1, 0]]]));
    const cache = new SemanticCache({ embedder });
    expect(await cache.get("hello")).toBeNull();
  });

  it("hit returns cached response", async () => {
    const embedder = makeEmbedder(new Map([["hello", [1, 0]]]));
    const cache = new SemanticCache({ embedder, threshold: 0.99 });
    await cache.set("hello", "world");
    expect(await cache.get("hello")).toBe("world");
  });

  it("similar query above threshold is a hit", async () => {
    const vectors = new Map([
      ["what is the capital of France?", [1, 0.01]],
      ["capital of France?", [0.999, 0.02]],
    ]);
    const embedder = makeEmbedder(vectors);
    const cache = new SemanticCache({ embedder, threshold: 0.9 });
    await cache.set("what is the capital of France?", "Paris");
    const result = await cache.get("capital of France?");
    expect(result).toBe("Paris");
  });

  it("dissimilar query below threshold is a miss", async () => {
    const vectors = new Map([
      ["what is the capital of France?", [1, 0]],
      ["tell me about dogs", [0, 1]],
    ]);
    const embedder = makeEmbedder(vectors);
    const cache = new SemanticCache({ embedder, threshold: 0.9 });
    await cache.set("what is the capital of France?", "Paris");
    expect(await cache.get("tell me about dogs")).toBeNull();
  });

  it("TTL: expired entries are skipped", async () => {
    const embedder = makeEmbedder(new Map([["q", [1, 0]]]));
    const cache = new SemanticCache({ embedder, threshold: 0.99, ttlMs: 1 });
    await cache.set("q", "answer");
    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get("q")).toBeNull();
  });

  it("maxEntries: evicts oldest when at capacity", async () => {
    const vectors = new Map<string, number[]>();
    for (let i = 0; i < 3; i++) {
      const v = new Array(3).fill(0);
      v[i] = 1;
      vectors.set(`q${i}`, v);
    }
    const embedder = makeEmbedder(vectors);
    const cache = new SemanticCache({ embedder, threshold: 0.99, maxEntries: 2 });

    await cache.set("q0", "r0");
    await new Promise((r) => setTimeout(r, 5));
    await cache.set("q1", "r1");
    expect(cache.size).toBe(2);

    await cache.set("q2", "r2");
    expect(cache.size).toBe(2);

    // q0 was oldest — should be evicted
    expect(await cache.get("q0")).toBeNull();
  });

  it("invalidate() removes matching entry by query string", async () => {
    const embedder = makeEmbedder(new Map([["q", [1, 0]]]));
    const cache = new SemanticCache({ embedder, threshold: 0.99 });
    await cache.set("q", "answer");
    cache.invalidate("q");
    expect(await cache.get("q")).toBeNull();
    expect(cache.size).toBe(0);
  });

  it("clear() empties the cache", async () => {
    const vectors = new Map([
      ["a", [1, 0]],
      ["b", [0, 1]],
    ]);
    const embedder = makeEmbedder(vectors);
    const cache = new SemanticCache({ embedder });
    await cache.set("a", "ra");
    await cache.set("b", "rb");
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("stats() tracks size and totalHits", async () => {
    const embedder = makeEmbedder(new Map([["q", [1, 0]]]));
    const cache = new SemanticCache({ embedder, threshold: 0.99 });
    await cache.set("q", "answer");
    await cache.get("q");
    await cache.get("q");
    expect(cache.stats()).toEqual({ size: 1, totalHits: 2 });
  });
});
