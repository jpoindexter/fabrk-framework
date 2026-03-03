import { describe, it, expect } from "vitest";
import { generateSitemap } from "../build/sitemap-gen";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Route } from "../runtime/router";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sitemap-"));
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    pattern: "/",
    regex: /^\//,
    paramNames: [],
    filePath: "/app/page.tsx",
    layoutPaths: [],
    type: "page",
    ...overrides,
  };
}

describe("generateSitemap", () => {
  it("writes sitemap.xml to outDir", async () => {
    const outDir = makeTmpDir();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute({ pattern: "/", regex: /^\/$/ })],
      outDir,
    });
    expect(fs.existsSync(path.join(outDir, "sitemap.xml"))).toBe(true);
  });

  it("writes robots.txt to outDir", async () => {
    const outDir = makeTmpDir();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [],
      outDir,
    });
    expect(fs.existsSync(path.join(outDir, "robots.txt"))).toBe(true);
    const content = fs.readFileSync(path.join(outDir, "robots.txt"), "utf-8");
    expect(content).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("includes static routes in sitemap", async () => {
    const outDir = makeTmpDir();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute({ pattern: "/about", regex: /^\/about$/, filePath: "/app/about/page.tsx" })],
      outDir,
    });
    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain("https://example.com/about");
  });

  it("excludes API routes from sitemap", async () => {
    const outDir = makeTmpDir();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute({ pattern: "/api/data", regex: /^\/api\/data$/, filePath: "/app/api/data.ts", type: "api" })],
      outDir,
    });
    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).not.toContain("/api/data");
  });

  it("excludes routes with sitemap = false", async () => {
    const outDir = makeTmpDir();
    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [makeRoute({ pattern: "/secret", regex: /^\/secret$/, filePath: "/app/secret/page.tsx" })],
      modules: new Map([["/app/secret/page.tsx", { sitemap: false }]]),
      outDir,
    });
    const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    expect(xml).not.toContain("/secret");
  });
});
