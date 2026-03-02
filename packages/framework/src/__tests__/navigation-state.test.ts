import { describe, it, expect } from "vitest";
import {
  storePrefetchResponse,
  getPrefetchResponse,
  clearPrefetchCache,
} from "../client/navigation-state";

describe("prefetch cache", () => {
  it("stores and retrieves responses", () => {
    clearPrefetchCache();
    storePrefetchResponse("/about", "<html>about</html>");
    expect(getPrefetchResponse("/about")).toBe("<html>about</html>");
  });

  it("returns null for missing entries", () => {
    clearPrefetchCache();
    expect(getPrefetchResponse("/nonexistent")).toBeNull();
  });

  it("evicts oldest entries at capacity", () => {
    clearPrefetchCache();
    // Fill cache beyond capacity
    for (let i = 0; i < 55; i++) {
      storePrefetchResponse(`/page/${i}`, `<html>page ${i}</html>`);
    }
    // First entries should be evicted
    expect(getPrefetchResponse("/page/0")).toBeNull();
    expect(getPrefetchResponse("/page/1")).toBeNull();
    // Recent entries should remain
    expect(getPrefetchResponse("/page/54")).toBe("<html>page 54</html>");
  });
});
