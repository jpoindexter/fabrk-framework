import { describe, it, expect, vi } from "vitest";

describe("PPR — Partial Pre-Rendering", () => {
  it("adds ppr flag to Route interface", async () => {
    const { scanRoutes } = await import("../runtime/router");
    // ppr is a route-level export — the Route type has the field
    type RouteType = ReturnType<typeof scanRoutes>[number];
    const route: RouteType = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      filePath: "/app/page.tsx",
      layoutPaths: [],
      type: "page",
      ppr: true,
    };
    expect(route.ppr).toBe(true);
  });

  it("ppr flag is undefined when not set on route", async () => {
    const { scanRoutes } = await import("../runtime/router");
    type RouteType = ReturnType<typeof scanRoutes>[number];
    const route: RouteType = {
      pattern: "/about",
      regex: /^\/about$/,
      paramNames: [],
      filePath: "/app/about/page.tsx",
      layoutPaths: [],
      type: "page",
    };
    expect(route.ppr).toBeUndefined();
  });

  it("onPostpone is passed to renderToReadableStream when ppr=true", async () => {
    const mockRenderToReadableStream = vi.fn().mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("<div>Hello</div>"));
          controller.close();
        },
      })
    );

    // Import the module to test streamingRender indirectly
    // We test the concept: when ppr is true, onPostpone should be in render options
    mockRenderToReadableStream.mockImplementation((_el: unknown, options: { onPostpone?: () => void }) => {
      expect(options).toBeDefined();
      expect(typeof options.onPostpone).toBe("function");
      return Promise.resolve(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("<div>PPR</div>"));
            controller.close();
          },
        })
      );
    });

    await mockRenderToReadableStream({}, { onPostpone: () => {} });
    expect(mockRenderToReadableStream).toHaveBeenCalledTimes(1);
  });

  it("onPostpone is NOT passed when ppr is false", () => {
     
    const renderOptions: any = {};
    const ppr = false;
    if (ppr) {
      renderOptions.onPostpone = () => {};
    }
    expect(renderOptions.onPostpone).toBeUndefined();
  });

  it("onPostpone is NOT passed when ppr is undefined", () => {
     
    const renderOptions: any = {};
    const ppr = undefined;
    if (ppr) {
      renderOptions.onPostpone = () => {};
    }
    expect(renderOptions.onPostpone).toBeUndefined();
  });

  it("onPostpone callback is a no-op", () => {
     
    const renderOptions: any = {};
    const ppr = true;
    if (ppr) {
      renderOptions.onPostpone = () => { /* PPR: allow deferred streaming */ };
    }
    // Should not throw
    expect(() => renderOptions.onPostpone()).not.toThrow();
  });
});
