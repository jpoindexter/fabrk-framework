import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanRoutes, matchRoute, collectBoundaries } from "../runtime/router";

describe("catch-all routes", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-catchall-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("scans [...slug] catch-all routes", () => {
    const dir = path.join(appDir, "docs", "[...slug]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/docs/:slug");
    expect(routes[0].catchAll).toBe(true);
    expect(routes[0].paramNames).toEqual(["slug"]);
  });

  it("matches catch-all with single segment", () => {
    const dir = path.join(appDir, "docs", "[...slug]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/docs/intro");
    expect(matched).not.toBeNull();
     
    expect(matched!.params.slug).toBe("intro");
  });

  it("matches catch-all with multiple segments", () => {
    const dir = path.join(appDir, "docs", "[...slug]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/docs/api/auth/login");
    expect(matched).not.toBeNull();
     
    expect(matched!.params.slug).toBe("api/auth/login");
  });

  it("does not match catch-all with zero segments", () => {
    const dir = path.join(appDir, "docs", "[...slug]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/docs");
    expect(matched).toBeNull();
  });
});

describe("optional catch-all routes", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-optcatchall-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("scans [[...slug]] optional catch-all routes", () => {
    const dir = path.join(appDir, "shop", "[[...slug]]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].optionalCatchAll).toBe(true);
    expect(routes[0].paramNames).toEqual(["slug"]);
  });

  it("matches optional catch-all with zero segments", () => {
    const dir = path.join(appDir, "shop", "[[...slug]]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/shop");
    expect(matched).not.toBeNull();
     
    expect(matched!.params.slug).toBeUndefined();
  });

  it("matches optional catch-all with single segment", () => {
    const dir = path.join(appDir, "shop", "[[...slug]]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/shop/electronics");
    expect(matched).not.toBeNull();
     
    expect(matched!.params.slug).toBe("electronics");
  });

  it("matches optional catch-all with multiple segments", () => {
    const dir = path.join(appDir, "shop", "[[...slug]]");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/shop/electronics/phones/iphone");
    expect(matched).not.toBeNull();
     
    expect(matched!.params.slug).toBe("electronics/phones/iphone");
  });
});

describe("route groups", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-groups-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("strips (group) from URL pattern", () => {
    const dir = path.join(appDir, "(marketing)", "about");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/about");
  });

  it("matches routes inside groups by URL", () => {
    const dir = path.join(appDir, "(marketing)", "pricing");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/pricing");
    expect(matched).not.toBeNull();
     
    expect(matched!.route.pattern).toBe("/pricing");
  });

  it("handles nested groups", () => {
    const dir = path.join(appDir, "(admin)", "(settings)", "profile");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/profile");
  });

  it("group at root level produces /", () => {
    const dir = path.join(appDir, "(marketing)");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/");
  });

  it("collects layouts through groups", () => {
    const groupDir = path.join(appDir, "(admin)");
    const pageDir = path.join(groupDir, "dashboard");
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "layout.tsx"), "");
    fs.writeFileSync(path.join(groupDir, "layout.tsx"), "");
    fs.writeFileSync(path.join(pageDir, "page.tsx"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    // Should collect both root and group layouts
    expect(routes[0].layoutPaths).toHaveLength(2);
  });
});

describe("route sorting priority", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sort-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("sorts: static > dynamic > catch-all > optional catch-all", () => {
    // Create all route types under /docs
    fs.mkdirSync(path.join(appDir, "docs", "intro"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "docs", "[id]"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "docs", "[...slug]"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "docs", "[[...path]]"), { recursive: true });

    fs.writeFileSync(path.join(appDir, "docs", "intro", "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "docs", "[id]", "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "docs", "[...slug]", "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "docs", "[[...path]]", "page.tsx"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(4);

    // Static first
    expect(routes[0].pattern).toBe("/docs/intro");
    // Then dynamic
    expect(routes[1].pattern).toBe("/docs/:id");
    // Then catch-all
    expect(routes[2].catchAll).toBe(true);
    // Then optional catch-all
    expect(routes[3].optionalCatchAll).toBe(true);
  });

  it("static routes match before dynamic for /docs/intro", () => {
    fs.mkdirSync(path.join(appDir, "docs", "intro"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "docs", "[id]"), { recursive: true });
    fs.writeFileSync(path.join(appDir, "docs", "intro", "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "docs", "[id]", "page.tsx"), "");

    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/docs/intro");
     
    expect(matched!.route.pattern).toBe("/docs/intro");
     
    expect(matched!.params).toEqual({});
  });
});

describe("collectBoundaries", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-boundaries-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("finds error.tsx at route level", () => {
    const routeDir = path.join(appDir, "dashboard");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "error.tsx"), "");
    fs.writeFileSync(path.join(routeDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, routeDir);
    expect(result.errorPath).toContain("error.tsx");
  });

  it("finds loading.tsx at route level", () => {
    const routeDir = path.join(appDir, "dashboard");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "loading.tsx"), "");
    fs.writeFileSync(path.join(routeDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, routeDir);
    expect(result.loadingPath).toContain("loading.tsx");
  });

  it("finds not-found.tsx at route level", () => {
    const routeDir = path.join(appDir, "dashboard");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "not-found.tsx"), "");
    fs.writeFileSync(path.join(routeDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, routeDir);
    expect(result.notFoundPath).toContain("not-found.tsx");
  });

  it("inherits boundaries from parent directories", () => {
    fs.writeFileSync(path.join(appDir, "error.tsx"), "");
    const routeDir = path.join(appDir, "blog", "[slug]");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, routeDir);
    expect(result.errorPath).toContain(path.join("app", "error.tsx"));
  });

  it("nearest boundary wins over parent", () => {
    fs.writeFileSync(path.join(appDir, "error.tsx"), "root error");
    const blogDir = path.join(appDir, "blog");
    fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(path.join(blogDir, "error.tsx"), "blog error");
    fs.writeFileSync(path.join(blogDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, blogDir);
    expect(result.errorPath).toContain(path.join("blog", "error.tsx"));
  });

  it("returns undefined when no boundaries exist", () => {
    const routeDir = path.join(appDir, "about");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "page.tsx"), "");

    const result = collectBoundaries(appDir, routeDir);
    expect(result.errorPath).toBeUndefined();
    expect(result.loadingPath).toBeUndefined();
    expect(result.notFoundPath).toBeUndefined();
  });

  it("scanRoutes attaches boundary paths to routes", () => {
    const dashDir = path.join(appDir, "dashboard");
    fs.mkdirSync(dashDir, { recursive: true });
    fs.writeFileSync(path.join(dashDir, "page.tsx"), "");
    fs.writeFileSync(path.join(dashDir, "error.tsx"), "");
    fs.writeFileSync(path.join(dashDir, "loading.tsx"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].errorPath).toContain("error.tsx");
    expect(routes[0].loadingPath).toContain("loading.tsx");
    expect(routes[0].notFoundPath).toBeUndefined();
  });
});
