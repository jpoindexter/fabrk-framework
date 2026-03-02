import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCachedFetch,
  clearFetchCache,
  revalidateTag,
  revalidatePath,
  getCacheStats,
  initFetchCache,
} from "../runtime/fetch-cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: string, status = 200): typeof globalThis.fetch {
  return vi.fn().mockImplementation(
    () =>
      new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

beforeEach(() => {
  clearFetchCache();
  initFetchCache({ maxEntries: 200 });
});

afterEach(() => {
  clearFetchCache();
});

// ---------------------------------------------------------------------------
// Basic caching
// ---------------------------------------------------------------------------

describe("createCachedFetch", () => {
  it("caches GET responses", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data");
    await cached("https://api.example.com/data");

    // Should only call original once
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("does not cache POST requests", async () => {
    const original = mockFetch('{"ok": true}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data", { method: "POST" });
    await cached("https://api.example.com/data", { method: "POST" });

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("does not cache when cache: no-store", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data", { cache: "no-store" });
    await cached("https://api.example.com/data", { cache: "no-store" });

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("skips cache for requests with Authorization header", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data", {
      headers: { Authorization: "Bearer token" },
    });
    await cached("https://api.example.com/data", {
      headers: { Authorization: "Bearer token" },
    });

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("skips cache for requests with Cookie header", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data", {
      headers: { Cookie: "session=abc" },
    });
    await cached("https://api.example.com/data", {
      headers: { Cookie: "session=abc" },
    });

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("serves from cache with force-cache even when stale", async () => {
    initFetchCache({ defaultRevalidate: 0 });
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data");
    // Force cache — should not re-fetch even though revalidate is 0
    await cached("https://api.example.com/data", { cache: "force-cache" });

    expect(original).toHaveBeenCalledTimes(1);
  });

  it("does not cache error responses", async () => {
    const original = mockFetch("Not Found", 404);
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/data");
    await cached("https://api.example.com/data");

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("returns correct body from cached response", async () => {
    const original = mockFetch('{"value": 42}');
    const cached = createCachedFetch(original);

    const res1 = await cached("https://api.example.com/data");
    const body1 = await res1.text();
    expect(body1).toBe('{"value": 42}');

    const res2 = await cached("https://api.example.com/data");
    const body2 = await res2.text();
    expect(body2).toBe('{"value": 42}');
  });
});

// ---------------------------------------------------------------------------
// Tag-based invalidation
// ---------------------------------------------------------------------------

describe("revalidateTag", () => {
  it("invalidates entries with matching tag", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/products", {
      next: { tags: ["products"] },
    } as RequestInit);

    expect(original).toHaveBeenCalledTimes(1);

    revalidateTag("products");

    await cached("https://api.example.com/products", {
      next: { tags: ["products"] },
    } as RequestInit);

    expect(original).toHaveBeenCalledTimes(2);
  });

  it("does not affect entries without the tag", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/users", {
      next: { tags: ["users"] },
    } as RequestInit);

    revalidateTag("products");

    await cached("https://api.example.com/users", {
      next: { tags: ["users"] },
    } as RequestInit);

    // Should still be cached (only "products" was invalidated)
    expect(original).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Path-based invalidation
// ---------------------------------------------------------------------------

describe("revalidatePath", () => {
  it("invalidates entries for a specific path", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/products?page=1");
    expect(original).toHaveBeenCalledTimes(1);

    revalidatePath("/products");

    await cached("https://api.example.com/products?page=1");
    expect(original).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Cache stats
// ---------------------------------------------------------------------------

describe("getCacheStats", () => {
  it("returns current cache size", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    expect(getCacheStats().size).toBe(0);

    await cached("https://api.example.com/a");
    expect(getCacheStats().size).toBe(1);

    await cached("https://api.example.com/b");
    expect(getCacheStats().size).toBe(2);
  });

  it("tracks tag count", async () => {
    const original = mockFetch('{"data": 1}');
    const cached = createCachedFetch(original);

    await cached("https://api.example.com/a", {
      next: { tags: ["tag1", "tag2"] },
    } as RequestInit);

    expect(getCacheStats().tags).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// LRU eviction
// ---------------------------------------------------------------------------

describe("LRU eviction", () => {
  it("evicts oldest entries when maxEntries exceeded", async () => {
    initFetchCache({ maxEntries: 3 });

    const original = vi.fn().mockImplementation(
      (url: string) =>
        new Response(url, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
    );

    const cached = createCachedFetch(original);

    await cached("https://api.example.com/1");
    await cached("https://api.example.com/2");
    await cached("https://api.example.com/3");
    await cached("https://api.example.com/4"); // Triggers eviction

    expect(getCacheStats().size).toBe(3);
  });
});
