import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanRoutes, matchRoute, collectLayouts } from "../runtime/router";

describe("scanRoutes", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-router-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("returns empty array for missing app dir", () => {
    const routes = scanRoutes(path.join(tmpDir, "nonexistent"));
    expect(routes).toEqual([]);
  });

  it("scans root page.tsx", () => {
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() {}");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/");
    expect(routes[0].type).toBe("page");
  });

  it("scans nested page", () => {
    const aboutDir = path.join(appDir, "about");
    fs.mkdirSync(aboutDir, { recursive: true });
    fs.writeFileSync(path.join(aboutDir, "page.tsx"), "export default function About() {}");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/about");
  });

  it("scans dynamic segments", () => {
    const slugDir = path.join(appDir, "blog", "[slug]");
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(path.join(slugDir, "page.tsx"), "export default function Post() {}");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/blog/:slug");
    expect(routes[0].paramNames).toEqual(["slug"]);
  });

  it("scans API routes", () => {
    const apiDir = path.join(appDir, "api", "hello");
    fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(path.join(apiDir, "route.ts"), "export function GET() {}");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/api/hello");
    expect(routes[0].type).toBe("api");
  });

  it("sorts static routes before dynamic", () => {
    // Create routes in order that would be wrong without sorting
    const dynamicDir = path.join(appDir, "blog", "[slug]");
    const staticDir = path.join(appDir, "blog", "featured");
    fs.mkdirSync(dynamicDir, { recursive: true });
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(dynamicDir, "page.tsx"), "");
    fs.writeFileSync(path.join(staticDir, "page.tsx"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(2);
    expect(routes[0].pattern).toBe("/blog/featured");
    expect(routes[1].pattern).toBe("/blog/:slug");
  });

  it("collects multiple routes at different depths", () => {
    // Root
    fs.writeFileSync(path.join(appDir, "page.tsx"), "");
    // /about
    fs.mkdirSync(path.join(appDir, "about"));
    fs.writeFileSync(path.join(appDir, "about", "page.tsx"), "");
    // /blog/[slug]
    fs.mkdirSync(path.join(appDir, "blog", "[slug]"), { recursive: true });
    fs.writeFileSync(path.join(appDir, "blog", "[slug]", "page.tsx"), "");
    // /api/data
    fs.mkdirSync(path.join(appDir, "api", "data"), { recursive: true });
    fs.writeFileSync(path.join(appDir, "api", "data", "route.ts"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(4);
    const patterns = routes.map((r) => r.pattern);
    expect(patterns).toContain("/");
    expect(patterns).toContain("/about");
    expect(patterns).toContain("/blog/:slug");
    expect(patterns).toContain("/api/data");
  });

  it("supports .ts, .tsx, .js, .jsx page extensions", () => {
    fs.writeFileSync(path.join(appDir, "page.ts"), "");
    fs.mkdirSync(path.join(appDir, "a"));
    fs.writeFileSync(path.join(appDir, "a", "page.jsx"), "");
    fs.mkdirSync(path.join(appDir, "b"));
    fs.writeFileSync(path.join(appDir, "b", "page.js"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(3);
  });

  it("ignores non-page/route files", () => {
    fs.writeFileSync(path.join(appDir, "layout.tsx"), "");
    fs.writeFileSync(path.join(appDir, "utils.ts"), "");
    fs.writeFileSync(path.join(appDir, "page.tsx"), "");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/");
  });
});

describe("matchRoute", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-match-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(path.join(appDir, "about"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "blog", "[slug]"), { recursive: true });
    fs.writeFileSync(path.join(appDir, "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "about", "page.tsx"), "");
    fs.writeFileSync(path.join(appDir, "blog", "[slug]", "page.tsx"), "");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("matches root path", () => {
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/");
    expect(matched).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.route.pattern).toBe("/");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.params).toEqual({});
  });

  it("matches static path", () => {
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/about");
    expect(matched).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.route.pattern).toBe("/about");
  });

  it("matches dynamic path and extracts params", () => {
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/blog/hello-world");
    expect(matched).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.route.pattern).toBe("/blog/:slug");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.params).toEqual({ slug: "hello-world" });
  });

  it("returns null for unmatched path", () => {
    const routes = scanRoutes(appDir);
    expect(matchRoute(routes, "/nonexistent")).toBeNull();
  });

  it("strips trailing slashes", () => {
    const routes = scanRoutes(appDir);
    const matched = matchRoute(routes, "/about/");
    expect(matched).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(matched!.route.pattern).toBe("/about");
  });
});

describe("collectLayouts", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-layout-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(path.join(appDir, "blog", "[slug]"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("collects root layout", () => {
    fs.writeFileSync(path.join(appDir, "layout.tsx"), "");
    const layouts = collectLayouts(appDir, appDir);
    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toContain("layout.tsx");
  });

  it("collects nested layouts in order", () => {
    fs.writeFileSync(path.join(appDir, "layout.tsx"), "");
    fs.writeFileSync(path.join(appDir, "blog", "layout.tsx"), "");
    const layouts = collectLayouts(appDir, path.join(appDir, "blog", "[slug]"));
    expect(layouts).toHaveLength(2);
    // Root layout first, then blog layout
    expect(layouts[0]).toContain(path.join("app", "layout.tsx"));
    expect(layouts[1]).toContain(path.join("blog", "layout.tsx"));
  });

  it("returns empty when no layouts exist", () => {
    const layouts = collectLayouts(appDir, path.join(appDir, "blog"));
    expect(layouts).toEqual([]);
  });

  it("routes include layout paths from scanRoutes", () => {
    fs.writeFileSync(path.join(appDir, "layout.tsx"), "");
    fs.writeFileSync(path.join(appDir, "blog", "[slug]", "page.tsx"), "");
    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].layoutPaths).toHaveLength(1);
    expect(routes[0].layoutPaths[0]).toContain("layout.tsx");
  });
});
