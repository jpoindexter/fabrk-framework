import { describe, it, expect } from "vitest";
import {
  collectStaticRoutes,
  resolveOutputPath,
} from "../runtime/static-export";
import type { Route } from "../runtime/router";

// ---------------------------------------------------------------------------
// resolveOutputPath
// ---------------------------------------------------------------------------

describe("resolveOutputPath", () => {
  it("resolves root to /index.html", () => {
    expect(resolveOutputPath("/", {})).toBe("/index.html");
  });

  it("resolves static route to /path/index.html", () => {
    expect(resolveOutputPath("/about", {})).toBe("/about/index.html");
  });

  it("resolves dynamic params", () => {
    expect(resolveOutputPath("/blog/:slug", { slug: "hello" })).toBe(
      "/blog/hello/index.html",
    );
  });

  it("resolves multiple params", () => {
    expect(
      resolveOutputPath("/docs/:section/:page", {
        section: "api",
        page: "auth",
      }),
    ).toBe("/docs/api/auth/index.html");
  });

  it("strips trailing slashes", () => {
    expect(resolveOutputPath("/about/", {})).toBe("/about/index.html");
  });
});

// ---------------------------------------------------------------------------
// collectStaticRoutes
// ---------------------------------------------------------------------------

function makeRoute(overrides: Partial<Route>): Route {
  return {
    pattern: "/",
    regex: /^\/$/,
    paramNames: [],
    filePath: "/app/page.tsx",
    layoutPaths: [],
    type: "page",
    ...overrides,
  };
}

describe("collectStaticRoutes", () => {
  it("collects routes with generateStaticParams", async () => {
    const route = makeRoute({
      pattern: "/blog/:slug",
      filePath: "/app/blog/[slug]/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => null,
      generateStaticParams: () => [{ slug: "hello" }, { slug: "world" }],
    });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(2);
    expect(result[0].outputPath).toBe("/blog/hello/index.html");
    expect(result[1].outputPath).toBe("/blog/world/index.html");
  });

  it("collects force-static routes", async () => {
    const route = makeRoute({
      pattern: "/about",
      filePath: "/app/about/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => null,
      dynamic: "force-static",
    });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(1);
    expect(result[0].outputPath).toBe("/about/index.html");
  });

  it("collects static routes without dynamic segments", async () => {
    const route = makeRoute({
      pattern: "/contact",
      filePath: "/app/contact/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { default: () => null });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(1);
    expect(result[0].outputPath).toBe("/contact/index.html");
  });

  it("skips API routes", async () => {
    const route = makeRoute({
      pattern: "/api/hello",
      filePath: "/app/api/hello/route.ts",
      type: "api",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { GET: () => new Response("ok") });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(0);
  });

  it("skips dynamic routes without generateStaticParams", async () => {
    const route = makeRoute({
      pattern: "/blog/:slug",
      filePath: "/app/blog/[slug]/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { default: () => null });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(0);
  });

  it("skips routes without loaded module", async () => {
    const route = makeRoute({
      pattern: "/missing",
      filePath: "/app/missing/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(0);
  });

  it("handles async generateStaticParams", async () => {
    const route = makeRoute({
      pattern: "/docs/:id",
      filePath: "/app/docs/[id]/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => null,
      generateStaticParams: async () => [{ id: "1" }, { id: "2" }, { id: "3" }],
    });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(3);
  });

  it("handles generateStaticParams returning non-array gracefully", async () => {
    const route = makeRoute({
      pattern: "/bad/:slug",
      filePath: "/app/bad/[slug]/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => null,
      generateStaticParams: () => "not an array",
    });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(0);
  });

  it("handles generateStaticParams throwing gracefully", async () => {
    const route = makeRoute({
      pattern: "/error/:slug",
      filePath: "/app/error/[slug]/page.tsx",
    });

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => null,
      generateStaticParams: () => {
        throw new Error("fetch failed");
      },
    });

    const result = await collectStaticRoutes({ routes: [route], modules });
    expect(result).toHaveLength(0);
  });
});
