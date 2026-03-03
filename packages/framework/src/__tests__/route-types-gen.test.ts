import { describe, it, expect } from "vitest";
import { generateRouteTypes } from "../runtime/route-types-gen";
import type { Route } from "../runtime/router";

function makeRoute(overrides: Partial<Route> = {}): Route {
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

describe("generateRouteTypes", () => {
  it("generates RoutePattern union from page routes", () => {
    const routes = [
      makeRoute({ pattern: "/" }),
      makeRoute({ pattern: "/about" }),
      makeRoute({ pattern: "/blog" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain('RoutePattern = "/" | "/about" | "/blog"');
  });

  it("excludes api routes from RoutePattern", () => {
    const routes = [
      makeRoute({ pattern: "/", type: "page" }),
      makeRoute({ pattern: "/api/health", type: "api" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain('RoutePattern = "/"');
    expect(output).not.toContain("/api/health");
  });

  it("generates correct param type for dynamic segment [slug]", () => {
    const routes = [
      makeRoute({ pattern: "/blog/[slug]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("slug: string");
  });

  it("generates correct param type for catch-all [...rest]", () => {
    const routes = [
      makeRoute({ pattern: "/docs/[...rest]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("rest: string[]");
  });

  it("generates correct param type for optional catch-all [[...rest]]", () => {
    const routes = [
      makeRoute({ pattern: "/docs/[[...rest]]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("rest?: string[]");
  });

  it("generates correct param type for mixed params /[org]/[repo]/[...path]", () => {
    const routes = [
      makeRoute({ pattern: "/[org]/[repo]/[...path]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("org: string");
    expect(output).toContain("repo: string");
    expect(output).toContain("path: string[]");
  });

  it("generates Record<string, never> for static routes", () => {
    const routes = [
      makeRoute({ pattern: "/about" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("Record<string, never>");
  });

  it("handles empty routes array", () => {
    const output = generateRouteTypes([]);
    expect(output).toContain("RoutePattern = never");
    expect(output).toContain("RouteMap = Record<string, never>");
  });

  it("generates ExtractParams utility type", () => {
    const routes = [
      makeRoute({ pattern: "/blog/[slug]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("ExtractParams");
    expect(output).toContain("_DynSeg");
  });

  it("generates RouteMap interface", () => {
    const routes = [
      makeRoute({ pattern: "/" }),
      makeRoute({ pattern: "/blog/[slug]" }),
    ];
    const output = generateRouteTypes(routes);
    expect(output).toContain("interface RouteMap");
    expect(output).toContain('"/": Record<string, never>');
    expect(output).toContain('"/blog/[slug]": { slug: string }');
  });
});
