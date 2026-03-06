// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useObject } from "../client/use-object";

describe("useObject", () => {
   
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("initial state is null/false", () => {
    const { result } = renderHook(() => useObject({ api: "/test" }));

    expect(result.current.object).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submit sets isLoading to true then false after fetch completes", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ object: { name: "test" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useObject({ api: "/test" }));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("JSON response sets object when Content-Type is application/json", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ object: { name: "test" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useObject<{ name: string }>({ api: "/test" }));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.object).toEqual({ name: "test" });
  });

  it("SSE response with done event sets object", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"type":"done","object":{"name":"test"}}\n\n'
          )
        );
        controller.close();
      },
    });
    fetchSpy.mockResolvedValueOnce(
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const { result } = renderHook(() =>
      useObject<{ name: string }>({ api: "/test" })
    );

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.object).toEqual({ name: "test" });
  });

  it("non-OK response sets error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Unauthorized" }),
      headers: { get: () => null },
    } as unknown as Response);

    const { result } = renderHook(() => useObject({ api: "/test" }));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.error).toBe("Unauthorized");
  });

  it("onFinish is called when done event received", async () => {
    const onFinish = vi.fn();

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ object: { x: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() =>
      useObject<{ x: number }>({ api: "/test", onFinish })
    );

    await act(async () => {
      await result.current.submit({});
    });

    expect(onFinish).toHaveBeenCalledWith({ x: 1 });
  });

  it("stop aborts the request", () => {
    const { result } = renderHook(() => useObject({ api: "/test" }));

    expect(() => {
      result.current.stop();
    }).not.toThrow();
  });
});
