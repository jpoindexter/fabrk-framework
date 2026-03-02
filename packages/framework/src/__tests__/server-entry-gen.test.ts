import { describe, it, expect } from "vitest";
import { generateServerEntry } from "../runtime/server-entry-gen";
import type { Route } from "../runtime/router";

describe("generateServerEntry", () => {
  it("generates valid JS with route imports", () => {
    const routes: Route[] = [
      {
        pattern: "/",
        regex: /^\/$/,
        paramNames: [],
        filePath: "/app/page.tsx",
        layoutPaths: ["/app/layout.tsx"],
        type: "page",
      },
      {
        pattern: "/about",
        regex: /^\/about$/,
        paramNames: [],
        filePath: "/app/about/page.tsx",
        layoutPaths: ["/app/layout.tsx"],
        type: "page",
      },
      {
        pattern: "/api/hello",
        regex: /^\/api\/hello$/,
        paramNames: [],
        filePath: "/app/api/hello/route.ts",
        layoutPaths: [],
        type: "api",
      },
    ];

    const source = generateServerEntry(routes, "/app");

    // Should import all route modules
    expect(source).toContain('import * as route_0 from "/app/page.tsx"');
    expect(source).toContain('import * as route_1 from "/app/about/page.tsx"');
    expect(source).toContain('import * as route_2 from "/app/api/hello/route.ts"');

    // Should import layout modules
    expect(source).toContain('import * as layout_0 from "/app/layout.tsx"');

    // Should export routes array
    expect(source).toContain("export const routes =");

    // Should serialize regex as constructor
    expect(source).toContain("new RegExp(");

    // Should include route metadata
    expect(source).toContain('"page"');
    expect(source).toContain('"api"');
  });

  it("handles catch-all and optional catch-all flags", () => {
    const routes: Route[] = [
      {
        pattern: "/docs/:slug",
        regex: /^\/docs\/(.+)$/,
        paramNames: ["slug"],
        filePath: "/app/docs/[...slug]/page.tsx",
        layoutPaths: [],
        type: "page",
        catchAll: true,
      },
      {
        pattern: "/shop/:path",
        regex: /^\/shop(?:\/(.*))?$/,
        paramNames: ["path"],
        filePath: "/app/shop/[[...path]]/page.tsx",
        layoutPaths: [],
        type: "page",
        optionalCatchAll: true,
      },
    ];

    const source = generateServerEntry(routes, "/app");
    expect(source).toContain("catchAll: true");
    expect(source).toContain("optionalCatchAll: true");
  });

  it("includes boundary paths", () => {
    const routes: Route[] = [
      {
        pattern: "/dashboard",
        regex: /^\/dashboard$/,
        paramNames: [],
        filePath: "/app/dashboard/page.tsx",
        layoutPaths: [],
        type: "page",
        errorPath: "/app/dashboard/error.tsx",
        loadingPath: "/app/dashboard/loading.tsx",
        notFoundPath: "/app/not-found.tsx",
      },
    ];

    const source = generateServerEntry(routes, "/app");
    expect(source).toContain("errorPath:");
    expect(source).toContain("loadingPath:");
    expect(source).toContain("notFoundPath:");

    // Should import boundary modules
    expect(source).toContain('import * as boundary_');
  });

  it("deduplicates layout imports", () => {
    const routes: Route[] = [
      {
        pattern: "/",
        regex: /^\/$/,
        paramNames: [],
        filePath: "/app/page.tsx",
        layoutPaths: ["/app/layout.tsx"],
        type: "page",
      },
      {
        pattern: "/about",
        regex: /^\/about$/,
        paramNames: [],
        filePath: "/app/about/page.tsx",
        layoutPaths: ["/app/layout.tsx"],
        type: "page",
      },
    ];

    const source = generateServerEntry(routes, "/app");
    // Should only import layout once
    const layoutImports = source.match(/import \* as layout_/g);
    expect(layoutImports).toHaveLength(1);
  });

  it("generates empty arrays for no routes", () => {
    const source = generateServerEntry([], "/app");
    expect(source).toContain("export const routes = [");
    expect(source).toContain("export const layoutModules = {");
  });
});
