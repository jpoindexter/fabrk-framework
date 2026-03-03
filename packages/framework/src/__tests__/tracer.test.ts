import { describe, it, expect, vi, beforeEach } from "vitest";
import { startSpan, getActiveSpan, _resetTracer, initTracer } from "../runtime/tracer";

beforeEach(() => {
  _resetTracer();
});

describe("OpenTelemetry Tracer", () => {
  it("runs fn directly when OTel is not installed (zero cost)", () => {
    const result = startSpan("test", () => 42);
    expect(result).toBe(42);
  });

  it("runs async fn directly when OTel is not installed", async () => {
    const result = await startSpan("test", async () => {
      await new Promise((r) => setTimeout(r, 5));
      return "async-result";
    });
    expect(result).toBe("async-result");
  });

  it("getActiveSpan returns undefined when OTel is not installed", () => {
    expect(getActiveSpan()).toBeUndefined();
  });

  it("propagates errors from fn when OTel is not installed", () => {
    expect(() => startSpan("test", () => { throw new Error("boom"); })).toThrow("boom");
  });

  it("propagates async errors when OTel is not installed", async () => {
    await expect(
      startSpan("test", async () => { throw new Error("async-boom"); })
    ).rejects.toThrow("async-boom");
  });

  it("initTracer is idempotent", async () => {
    await initTracer("test-1");
    await initTracer("test-2");
    // Should not throw; second call is a no-op
    expect(startSpan("after-init", () => 99)).toBe(99);
  });

  it("startSpan works with sync return values", () => {
    expect(startSpan("sync", () => "hello")).toBe("hello");
    expect(startSpan("sync", () => null)).toBeNull();
    expect(startSpan("sync", () => undefined)).toBeUndefined();
  });

  it("startSpan returns promise for async functions", async () => {
    const result = startSpan("async", async () => "delayed");
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe("delayed");
  });

  it("handles nested startSpan calls", () => {
    const result = startSpan("outer", () => {
      return startSpan("inner", () => {
        return "nested";
      });
    });
    expect(result).toBe("nested");
  });

  it("_resetTracer allows re-initialization", async () => {
    await initTracer("first");
    _resetTracer();
    // After reset, should be in uninitialized state
    expect(getActiveSpan()).toBeUndefined();
    expect(startSpan("test", () => 42)).toBe(42);
  });
});
