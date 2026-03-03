import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateSitemap } from "../build/sitemap-gen";
import type { Route } from "../runtime/router";

function makeRoute(pattern: string, type: "page" | "api" = "page"): Route {
  return {
    pattern,
    regex: new RegExp(`^${pattern}$`),
    paramNames: [],
    filePath: `/app${pattern === "/" ? "" : pattern}/page.tsx`,
    layoutPaths: [],
    type,
  };
}

const tmpDirs: string[] = [];

function mkTmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-test-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("generateSitemap", () => {
  it("generates sitemap.xml and robots.txt", async () => {
    const outDir = mkTmp();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/"), makeRoute("/about")],
      outDir,
    });

    expect(fs.existsSync(path.join(outDir, "sitemap.xml"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "robots.txt"))).toBe(true);
  });

  it("includes root at priority 1.0 and others at 0.7", async () => {
    const outDir = mkTmp();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/"), makeRoute("/about")],
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<priority>1</priority>");
    expect(xml).toContain("<loc>https://example.com/about</loc>");
    expect(xml).toContain("<priority>0.7</priority>");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it("skips API routes", async () => {
    const outDir = mkTmp();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/"), makeRoute("/api/users", "api")],
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).not.toContain("/api/users");
    expect(xml).toContain("https://example.com/");
  });

  it("skips routes with sitemap: false in module", async () => {
    const route = makeRoute("/hidden");
    const outDir = mkTmp();
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { sitemap: false });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/"), route],
      modules,
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).not.toContain("/hidden");
  });

  it("handles dynamic routes with sitemap() function", async () => {
    const route: Route = {
      pattern: "/blog/:slug",
      regex: /^\/blog\/([^/]+)$/,
      paramNames: ["slug"],
      filePath: "/app/blog/[slug]/page.tsx",
      layoutPaths: [],
      type: "page",
    };
    const outDir = mkTmp();
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      sitemap: () => [
        { loc: "/blog/hello", lastmod: "2024-01-01", changefreq: "monthly", priority: 0.8 },
        { loc: "/blog/world" },
      ],
    });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [route],
      modules,
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("<loc>https://example.com/blog/hello</loc>");
    expect(xml).toContain("<lastmod>2024-01-01</lastmod>");
    expect(xml).toContain("<changefreq>monthly</changefreq>");
    expect(xml).toContain("<priority>0.8</priority>");
    expect(xml).toContain("<loc>https://example.com/blog/world</loc>");
  });

  it("skips dynamic routes without sitemap() function", async () => {
    const route: Route = {
      pattern: "/products/:id",
      regex: /^\/products\/([^/]+)$/,
      paramNames: ["id"],
      filePath: "/app/products/[id]/page.tsx",
      layoutPaths: [],
      type: "page",
    };
    const outDir = mkTmp();
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { default: () => null });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [route],
      modules,
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).not.toContain("/products/");
  });

  it("XML-escapes URLs with special characters", async () => {
    const route = makeRoute("/search");
    const outDir = mkTmp();
    const dynamicRoute: Route = {
      pattern: "/q/:term",
      regex: /^\/q\/([^/]+)$/,
      paramNames: ["term"],
      filePath: "/app/q/[term]/page.tsx",
      layoutPaths: [],
      type: "page",
    };
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(dynamicRoute.filePath, {
      sitemap: () => [{ loc: '/q/<script>&"it\'s"' }],
    });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [dynamicRoute],
      modules,
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
    expect(xml).toContain("&apos;");
    expect(xml).not.toContain("<script>");
  });

  it("robots.txt references sitemap URL", async () => {
    const outDir = mkTmp();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/")],
      outDir,
    });

    const robots = fs.readFileSync(path.join(outDir, "robots.txt"), "utf-8");
    expect(robots).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
  });

  it("creates outDir if missing", async () => {
    const base = mkTmp();
    const outDir = path.join(base, "nested", "dist");

    expect(fs.existsSync(outDir)).toBe(false);

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute("/")],
      outDir,
    });

    expect(fs.existsSync(path.join(outDir, "sitemap.xml"))).toBe(true);
  });

  it("handles empty routes array", async () => {
    const outDir = mkTmp();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [],
      outDir,
    });

    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("<url>");
  });
});
