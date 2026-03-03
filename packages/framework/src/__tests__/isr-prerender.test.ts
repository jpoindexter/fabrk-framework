import { describe, it, expect } from "vitest";
import { InMemoryISRCache, serveFromISR, getRevalidateInterval, getPageTags } from "../runtime/isr-cache";

describe("ISR pre-population", () => {
  it("serves pre-populated entry as stale (triggers background revalidation)", async () => {
    const cache = new InMemoryISRCache();
    // Pre-populate with timestamp=0 (immediately stale)
    await cache.set("/about", {
      html: "<html>pre-rendered</html>",
      timestamp: 0,
      revalidate: 60,
      tags: [],
    });

    const result = await serveFromISR(
      cache,
      "/about",
      60,
      async () => "<html>fresh</html>",
    );

    // Should serve stale pre-rendered content while revalidating in background
    expect(result.html).toBe("<html>pre-rendered</html>");
    expect(result.cached).toBe(true);
    expect(result.revalidating).toBe(true);
  });

  it("cache hit returns fresh entry without revalidation", async () => {
    const cache = new InMemoryISRCache();
    await cache.set("/about", {
      html: "<html>fresh</html>",
      timestamp: Date.now(),
      revalidate: 3600,
      tags: [],
    });

    const result = await serveFromISR(cache, "/about", 3600, async () => "new");
    expect(result.cached).toBe(true);
    expect(result.revalidating).toBe(false);
  });

  it("cache miss renders and stores", async () => {
    const cache = new InMemoryISRCache();
    const result = await serveFromISR(cache, "/new", 60, async () => "<html>rendered</html>");
    expect(result.html).toBe("<html>rendered</html>");
    expect(result.cached).toBe(false);

    const stored = await cache.get("/new");
    expect(stored?.html).toBe("<html>rendered</html>");
  });

  it("tag invalidation evicts entries", async () => {
    const cache = new InMemoryISRCache();
    await cache.set("/products", {
      html: "<html>products</html>",
      timestamp: Date.now(),
      revalidate: 60,
      tags: ["products"],
    });

    await cache.deleteByTag("products");
    expect(await cache.get("/products")).toBeNull();
  });

  it("delete removes entry without affecting others", async () => {
    const cache = new InMemoryISRCache();
    await cache.set("/a", { html: "a", timestamp: Date.now(), revalidate: 60, tags: [] });
    await cache.set("/b", { html: "b", timestamp: Date.now(), revalidate: 60, tags: [] });

    await cache.delete("/a");
    expect(await cache.get("/a")).toBeNull();
    expect(await cache.get("/b")).not.toBeNull();
  });

  it("LRU evicts oldest when over MAX_ENTRIES", async () => {
    const cache = new InMemoryISRCache();
    for (let i = 0; i < 200; i++) {
      await cache.set(`/page/${i}`, { html: `page ${i}`, timestamp: Date.now(), revalidate: 60, tags: [] });
    }
    await cache.set("/page/200", { html: "page 200", timestamp: Date.now(), revalidate: 60, tags: [] });
    expect(await cache.get("/page/0")).toBeNull();
    expect(await cache.get("/page/200")).not.toBeNull();
  });

  it("getRevalidateInterval returns null for non-numeric values", () => {
    expect(getRevalidateInterval({ revalidate: "60" })).toBeNull();
    expect(getRevalidateInterval({ revalidate: -1 })).toBeNull();
    expect(getRevalidateInterval({ revalidate: Infinity })).toBeNull();
    expect(getRevalidateInterval({ revalidate: 60 })).toBe(60);
  });

  it("getPageTags returns string array only", () => {
    expect(getPageTags({ tags: ["a", 1, "b", null] })).toEqual(["a", "b"]);
    expect(getPageTags({ tags: "not-an-array" })).toEqual([]);
    expect(getPageTags({})).toEqual([]);
  });
});
