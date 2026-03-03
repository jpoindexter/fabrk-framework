import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FilesystemISRCache } from "../runtime/isr-cache";
import type { ISRCacheHandler } from "../runtime/isr-cache";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let cache: FilesystemISRCache;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-isr-"));
  cache = new FilesystemISRCache(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("FilesystemISRCache", () => {
  it("set + get round-trip", async () => {
    const entry = { html: "<html/>", timestamp: Date.now(), revalidate: 60, tags: [] };
    await cache.set("/about", entry);
    const result = await cache.get("/about");
    expect(result?.html).toBe("<html/>");
    expect(result?.revalidate).toBe(60);
  });

  it("get returns null for missing key", async () => {
    expect(await cache.get("/missing")).toBeNull();
  });

  it("delete removes entry", async () => {
    await cache.set("/about", { html: "x", timestamp: 0, revalidate: 60, tags: [] });
    await cache.delete("/about");
    expect(await cache.get("/about")).toBeNull();
  });

  it("delete is idempotent for missing keys", async () => {
    await expect(cache.delete("/nonexistent")).resolves.not.toThrow();
  });

  it("deleteByTag removes all matching entries", async () => {
    await cache.set("/a", { html: "a", timestamp: 0, revalidate: 60, tags: ["products"] });
    await cache.set("/b", { html: "b", timestamp: 0, revalidate: 60, tags: ["products", "featured"] });
    await cache.set("/c", { html: "c", timestamp: 0, revalidate: 60, tags: ["other"] });

    await cache.deleteByTag("products");

    expect(await cache.get("/a")).toBeNull();
    expect(await cache.get("/b")).toBeNull();
    expect(await cache.get("/c")).not.toBeNull();
  });

  it("deleteByTag with no matching entries does nothing", async () => {
    await expect(cache.deleteByTag("nonexistent-tag")).resolves.not.toThrow();
  });

  it("persists across re-instantiation (same dir)", async () => {
    await cache.set("/about", { html: "<html/>", timestamp: 100, revalidate: 60, tags: [] });

    const cache2 = new FilesystemISRCache(tmpDir);
    const result = await cache2.get("/about");
    expect(result?.html).toBe("<html/>");
    expect(result?.timestamp).toBe(100);
  });

  it("handles path separators in keys safely", async () => {
    await cache.set("/blog/hello-world", { html: "blog", timestamp: 0, revalidate: 30, tags: [] });
    const result = await cache.get("/blog/hello-world");
    expect(result?.html).toBe("blog");
  });

  it("corrupt JSON file returns null (graceful)", async () => {
    const key = "/corrupt";
    const safeKey = key.replace(/^\//, "").replace(/\//g, "__") + ".json";
    fs.writeFileSync(path.join(tmpDir, safeKey), "{ not valid json", "utf-8");
    expect(await cache.get(key)).toBeNull();
  });

  it("implements ISRCacheHandler interface", () => {
    const handler: ISRCacheHandler = cache;
    expect(handler).toBeDefined();
  });
});
