import { describe, it, expect } from "vitest";
import { collectStaticRoutes, resolveOutputPath } from "../runtime/static-export";
import type { Route } from "../runtime/router";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    pattern: "/about",
    regex: /^\/about$/,
    paramNames: [],
    filePath: "/app/about/page.tsx",
    layoutPaths: [],
    type: "page",
    ...overrides,
  };
}

describe("collectStaticRoutes", () => {
  it("includes static routes with no dynamic segments", async () => {
    const route = makeRoute({ pattern: "/about" });
    const result = await collectStaticRoutes({
      routes: [route],
      modules: new Map([["/app/about/page.tsx", { default: () => null }]]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].outputPath).toBe("/about/index.html");
  });

  it("excludes API routes", async () => {
    const route = makeRoute({ type: "api" });
    const result = await collectStaticRoutes({
      routes: [route],
      modules: new Map([["/app/about/page.tsx", { default: () => null }]]),
    });
    expect(result).toHaveLength(0);
  });

  it("excludes dynamic routes without generateStaticParams", async () => {
    const route = makeRoute({ pattern: "/blog/:slug", paramNames: ["slug"] });
    const result = await collectStaticRoutes({
      routes: [route],
      modules: new Map([["/app/blog/page.tsx", { default: () => null }]]),
    });
    expect(result).toHaveLength(0);
  });

  it("includes dynamic routes with generateStaticParams", async () => {
    const route = makeRoute({
      pattern: "/blog/:slug",
      paramNames: ["slug"],
      filePath: "/app/blog/page.tsx",
    });
    const result = await collectStaticRoutes({
      routes: [route],
      modules: new Map([[
        "/app/blog/page.tsx",
        {
          default: () => null,
          generateStaticParams: async () => [{ slug: "hello" }, { slug: "world" }],
        },
      ]]),
    });
    expect(result).toHaveLength(2);
    expect(result[0].outputPath).toBe("/blog/hello/index.html");
    expect(result[1].outputPath).toBe("/blog/world/index.html");
  });

  it("includes routes with dynamic = 'force-static'", async () => {
    const route = makeRoute({ pattern: "/dynamic/:id", paramNames: ["id"] });
    const result = await collectStaticRoutes({
      routes: [route],
      modules: new Map([["/app/about/page.tsx", { default: () => null, dynamic: "force-static" }]]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].params).toEqual({});
  });

  it("resolves root path to /index.html", () => {
    expect(resolveOutputPath("/", {})).toBe("/index.html");
  });

  it("resolves /about to /about/index.html", () => {
    expect(resolveOutputPath("/about", {})).toBe("/about/index.html");
  });

  it("resolves dynamic path with params", () => {
    expect(resolveOutputPath("/blog/:slug", { slug: "hello" })).toBe("/blog/hello/index.html");
  });
});
