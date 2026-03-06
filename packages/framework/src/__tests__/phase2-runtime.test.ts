import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { handleImageRequest, isImageRequest } from "../runtime/image-handler";
import {
  InMemoryISRCache,
  serveFromISR,
  isrRevalidateTag,
  isrRevalidatePath,
  getRevalidateInterval,
  getPageTags,
} from "../runtime/isr-cache";
import { scanRoutes } from "../runtime/router";
import { generateSitemap } from "../build/sitemap-gen";

// ---------------------------------------------------------------------------
// Image handler tests
// ---------------------------------------------------------------------------

describe("image-handler", () => {

  it("isImageRequest matches /_fabrk/image", () => {
    expect(isImageRequest("/_fabrk/image")).toBe(true);
    expect(isImageRequest("/_fabrk/images")).toBe(false);
    expect(isImageRequest("/image")).toBe(false);
  });

  it("returns 400 for missing params", async () => {
    const req = new Request("http://localhost/_fabrk/image");
    const res = await handleImageRequest(req, "/tmp");
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid width", async () => {
    const req = new Request("http://localhost/_fabrk/image?url=/img.png&w=abc");
    const res = await handleImageRequest(req, "/tmp");
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent image", async () => {
    const req = new Request("http://localhost/_fabrk/image?url=/nonexistent.jpg&w=800");
    const res = await handleImageRequest(req, "/tmp");
    expect(res.status).toBe(404);
  });

  it("returns 403 for path traversal attempt", async () => {
    // parseImageParams catches ".." so this returns 400, not 403
    const req = new Request("http://localhost/_fabrk/image?url=/../../etc/passwd&w=800");
    const res = await handleImageRequest(req, "/tmp");
    expect(res.status).toBe(400);
  });

  it("serves original file as fallback when sharp not available", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-img-"));
    const imgDir = path.join(tmpDir, "images");
    fs.mkdirSync(imgDir, { recursive: true });
    // Create a tiny valid PNG (1x1 pixel)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    fs.writeFileSync(path.join(imgDir, "test.png"), pngHeader);

    const req = new Request("http://localhost/_fabrk/image?url=/images/test.png&w=100");
    const res = await handleImageRequest(req, tmpDir);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("public");

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("includes security headers", async () => {
    const req = new Request("http://localhost/_fabrk/image?url=/missing.jpg&w=100");
    const res = await handleImageRequest(req, "/tmp");
    // Even error responses should have security headers
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

// ---------------------------------------------------------------------------
// ISR cache tests
// ---------------------------------------------------------------------------

describe("isr-cache", () => {
  describe("InMemoryISRCache", () => {
    it("stores and retrieves entries", async () => {
      const cache = new InMemoryISRCache();
      await cache.set("/about", {
        html: "<p>About</p>",
        timestamp: Date.now(),
        revalidate: 60,
        tags: ["about"],
      });

      const entry = await cache.get("/about");
      expect(entry).not.toBeNull();
      expect(entry?.html).toBe("<p>About</p>");
    });

    it("returns null for missing entries", async () => {
      const cache = new InMemoryISRCache();
      expect(await cache.get("/missing")).toBeNull();
    });

    it("deletes entries", async () => {
      const cache = new InMemoryISRCache();
      await cache.set("/about", {
        html: "<p>About</p>",
        timestamp: Date.now(),
        revalidate: 60,
        tags: [],
      });
      await cache.delete("/about");
      expect(await cache.get("/about")).toBeNull();
    });

    it("deletes entries by tag", async () => {
      const cache = new InMemoryISRCache();
      await cache.set("/products/1", {
        html: "<p>Product 1</p>",
        timestamp: Date.now(),
        revalidate: 60,
        tags: ["products"],
      });
      await cache.set("/products/2", {
        html: "<p>Product 2</p>",
        timestamp: Date.now(),
        revalidate: 60,
        tags: ["products"],
      });
      await cache.set("/about", {
        html: "<p>About</p>",
        timestamp: Date.now(),
        revalidate: 60,
        tags: ["static"],
      });

      await cache.deleteByTag("products");
      expect(await cache.get("/products/1")).toBeNull();
      expect(await cache.get("/products/2")).toBeNull();
      expect(await cache.get("/about")).not.toBeNull();
    });
  });

  describe("serveFromISR", () => {
    it("renders and caches on first request", async () => {
      const cache = new InMemoryISRCache();
      const renderFn = vi.fn().mockResolvedValue("<p>Hello</p>");

      const result = await serveFromISR(cache, "/page", 60, renderFn);
      expect(result.html).toBe("<p>Hello</p>");
      expect(result.cached).toBe(false);
      expect(result.revalidating).toBe(false);
      expect(renderFn).toHaveBeenCalledOnce();

      // Verify it was cached
      const entry = await cache.get("/page");
      expect(entry?.html).toBe("<p>Hello</p>");
    });

    it("serves from cache on second request", async () => {
      const cache = new InMemoryISRCache();
      const renderFn = vi.fn().mockResolvedValue("<p>Hello</p>");

      await serveFromISR(cache, "/page", 60, renderFn);
      renderFn.mockClear();

      const result = await serveFromISR(cache, "/page", 60, renderFn);
      expect(result.html).toBe("<p>Hello</p>");
      expect(result.cached).toBe(true);
      expect(result.revalidating).toBe(false);
      expect(renderFn).not.toHaveBeenCalled();
    });

    it("serves stale and triggers revalidation for expired entries", async () => {
      const cache = new InMemoryISRCache();
      // Manually set an expired entry
      await cache.set("/page", {
        html: "<p>Old</p>",
        timestamp: Date.now() - 120_000, // 2 minutes ago
        revalidate: 60, // 1 minute TTL
        tags: [],
      });

      const renderFn = vi.fn().mockResolvedValue("<p>New</p>");
      const result = await serveFromISR(cache, "/page", 60, renderFn);

      expect(result.html).toBe("<p>Old</p>"); // Serves stale
      expect(result.cached).toBe(true);
      expect(result.revalidating).toBe(true);

      // Wait for background revalidation
      await new Promise((r) => setTimeout(r, 50));
      const updated = await cache.get("/page");
      expect(updated?.html).toBe("<p>New</p>");
    });
  });

  describe("revalidation helpers", () => {
    it("isrRevalidateTag clears matching entries", async () => {
      const cache = new InMemoryISRCache();
      await cache.set("/p1", {
        html: "p1",
        timestamp: Date.now(),
        revalidate: 60,
        tags: ["products"],
      });
      await isrRevalidateTag(cache, "products");
      expect(await cache.get("/p1")).toBeNull();
    });

    it("isrRevalidatePath clears specific path", async () => {
      const cache = new InMemoryISRCache();
      await cache.set("/about", {
        html: "about",
        timestamp: Date.now(),
        revalidate: 60,
        tags: [],
      });
      await isrRevalidatePath(cache, "/about");
      expect(await cache.get("/about")).toBeNull();
    });
  });

  describe("module helpers", () => {
    it("getRevalidateInterval reads revalidate export", () => {
      expect(getRevalidateInterval({ revalidate: 60 })).toBe(60);
      expect(getRevalidateInterval({ revalidate: 0 })).toBeNull();
      expect(getRevalidateInterval({ revalidate: -1 })).toBeNull();
      expect(getRevalidateInterval({ revalidate: Infinity })).toBeNull();
      expect(getRevalidateInterval({})).toBeNull();
    });

    it("getPageTags reads tags export", () => {
      expect(getPageTags({ tags: ["a", "b"] })).toEqual(["a", "b"]);
      expect(getPageTags({ tags: [1, "b", null] })).toEqual(["b"]);
      expect(getPageTags({})).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Parallel and intercepting routes
// ---------------------------------------------------------------------------

describe("parallel and intercepting routes", () => {

  it("detects @slot directories and attaches to parent route", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-par-"));
    const appDir = path.join(tmpDir, "app");

    // Create: app/dashboard/page.tsx + app/dashboard/@modal/page.tsx
    fs.mkdirSync(path.join(appDir, "dashboard", "@modal"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "dashboard", "page.tsx"),
      "export default function Dashboard() { return <div>Dashboard</div>; }",
    );
    fs.writeFileSync(
      path.join(appDir, "dashboard", "@modal", "page.tsx"),
      "export default function Modal() { return <div>Modal</div>; }",
    );

    const routes = scanRoutes(appDir);
    const dashboardRoute = routes.find((r) => r.pattern === "/dashboard");

    expect(dashboardRoute).toBeDefined();
    expect(dashboardRoute?.slots).toBeDefined();
    expect(dashboardRoute?.slots?.modal).toContain("@modal");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("detects default.tsx in @slot directories", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-slot-"));
    const appDir = path.join(tmpDir, "app");

    fs.mkdirSync(path.join(appDir, "dashboard", "@sidebar"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "dashboard", "page.tsx"),
      "export default function Dashboard() { return <div />; }",
    );
    fs.writeFileSync(
      path.join(appDir, "dashboard", "@sidebar", "default.tsx"),
      "export default function Default() { return <div />; }",
    );

    const routes = scanRoutes(appDir);
    const dashboardRoute = routes.find((r) => r.pattern === "/dashboard");

    expect(dashboardRoute?.slotDefaults).toBeDefined();
    expect(dashboardRoute?.slotDefaults?.sidebar).toContain("default.tsx");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("@slot directories don't create standalone routes", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-slotseg-"));
    const appDir = path.join(tmpDir, "app");

    // Pages inside @slot directories should NOT create standalone routes
    fs.mkdirSync(path.join(appDir, "dashboard", "@modal"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "dashboard", "page.tsx"),
      "export default function Dashboard() { return <div />; }",
    );
    fs.writeFileSync(
      path.join(appDir, "dashboard", "@modal", "page.tsx"),
      "export default function Modal() { return <div />; }",
    );

    const routes = scanRoutes(appDir);

    // Only 1 route — the dashboard page. The @modal/page.tsx is slot content only.
    expect(routes).toHaveLength(1);
    expect(routes[0].pattern).toBe("/dashboard");
    expect(routes[0].slots?.modal).toContain("@modal");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("detects intercepting route prefix (.)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-int-"));
    const appDir = path.join(tmpDir, "app");

    // app/feed/(.)photo/[id]/page.tsx — intercepts /photo/[id] from feed context
    fs.mkdirSync(path.join(appDir, "feed", "(.)photo", "[id]"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "feed", "(.)photo", "[id]", "page.tsx"),
      "export default function PhotoIntercepted() { return <div />; }",
    );

    const routes = scanRoutes(appDir);
    const intercepted = routes.find((r) => r.interceptDepth !== undefined);

    expect(intercepted).toBeDefined();
    expect(intercepted?.interceptDepth).toBe(0);
    // The URL pattern should use "photo" not "(.)photo"
    expect(intercepted?.pattern).toBe("/feed/photo/:id");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("detects (..) intercepting depth", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-intpar-"));
    const appDir = path.join(tmpDir, "app");

    fs.mkdirSync(path.join(appDir, "feed", "(..)photo"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "feed", "(..)photo", "page.tsx"),
      "export default function Photo() { return <div />; }",
    );

    const routes = scanRoutes(appDir);
    const intercepted = routes.find((r) => r.interceptDepth !== undefined);

    expect(intercepted).toBeDefined();
    expect(intercepted?.interceptDepth).toBe(1);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// scanRoutes symlink traversal prevention
// ---------------------------------------------------------------------------

describe("scanRoutes: symlink traversal prevention", () => {
  it("does not register symlinks as routes", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-symlink-"));
    const appDir = path.join(tmpDir, "app");
    const outsideDir = path.join(tmpDir, "outside");
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    // Create a legitimate page file outside app/
    const outsidePage = path.join(outsideDir, "page.tsx");
    fs.writeFileSync(outsidePage, "export default function P() { return null; }");

    // Create a symlink inside app/ pointing to the outside file
    const symlinkPage = path.join(appDir, "page.tsx");
    try {
      fs.symlinkSync(outsidePage, symlinkPage);
    } catch {
      // Skip on systems that disallow symlinks in test environments
      fs.rmSync(tmpDir, { recursive: true });
      return;
    }

    const routes = scanRoutes(appDir);
    // The symlinked page.tsx must NOT be registered as a route
    expect(routes.find((r) => r.filePath === symlinkPage)).toBeUndefined();

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("does not recurse into symlinked directories", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-symlinkdir-"));
    const appDir = path.join(tmpDir, "app");
    const outsideDir = path.join(tmpDir, "outside");
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(path.join(outsideDir, "secret"), { recursive: true });
    fs.writeFileSync(
      path.join(outsideDir, "secret", "page.tsx"),
      "export default function Secret() { return null; }",
    );

    // Symlink a directory inside app/ pointing outside
    const symlinkDir = path.join(appDir, "leaked");
    try {
      fs.symlinkSync(outsideDir, symlinkDir);
    } catch {
      fs.rmSync(tmpDir, { recursive: true });
      return;
    }

    const routes = scanRoutes(appDir);
    // Must not discover the route inside the symlinked directory
    expect(routes.find((r) => r.filePath.includes("secret"))).toBeUndefined();

    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// Sitemap generation tests
// ---------------------------------------------------------------------------

describe("sitemap-gen", () => {

  it("generates sitemap.xml and robots.txt", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sitemap-"));

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [
        {
          pattern: "/",
          regex: /^\/$/,
          paramNames: [],
          filePath: "/app/page.tsx",
          layoutPaths: [],
          type: "page",
        },
        {
          pattern: "/about",
          regex: /^\/about$/,
          paramNames: [],
          filePath: "/app/about/page.tsx",
          layoutPaths: [],
          type: "page",
        },
        {
          pattern: "/api/health",
          regex: /^\/api\/health$/,
          paramNames: [],
          filePath: "/app/api/health/route.ts",
          layoutPaths: [],
          type: "api",
        },
      ],
      outDir: tmpDir,
    });

    const sitemap = fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf-8");
    const robots = fs.readFileSync(path.join(tmpDir, "robots.txt"), "utf-8");

    // Sitemap should include page routes but not API routes
    expect(sitemap).toContain("https://example.com/");
    expect(sitemap).toContain("https://example.com/about");
    expect(sitemap).not.toContain("/api/health");
    expect(sitemap).toContain('<?xml version="1.0"');
    expect(sitemap).toContain("<urlset");

    // Robots.txt should reference sitemap
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Sitemap: https://example.com/sitemap.xml");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("excludes dynamic routes without sitemap export", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sm2-"));

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [
        {
          pattern: "/blog/:slug",
          regex: /^\/blog\/([^/]+)$/,
          paramNames: ["slug"],
          filePath: "/app/blog/[slug]/page.tsx",
          layoutPaths: [],
          type: "page",
        },
      ],
      outDir: tmpDir,
    });

    const sitemap = fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf-8");
    expect(sitemap).not.toContain("/blog/");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("includes dynamic entries from sitemap() export", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sm3-"));
    const modules = new Map<string, Record<string, unknown>>();
    modules.set("/app/blog/[slug]/page.tsx", {
      default: () => null,
      sitemap: async () => [
        { loc: "/blog/hello" },
        { loc: "/blog/world", changefreq: "daily" },
      ],
    });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [
        {
          pattern: "/blog/:slug",
          regex: /^\/blog\/([^/]+)$/,
          paramNames: ["slug"],
          filePath: "/app/blog/[slug]/page.tsx",
          layoutPaths: [],
          type: "page",
        },
      ],
      modules,
      outDir: tmpDir,
    });

    const sitemap = fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf-8");
    expect(sitemap).toContain("https://example.com/blog/hello");
    expect(sitemap).toContain("https://example.com/blog/world");
    expect(sitemap).toContain("<changefreq>daily</changefreq>");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("respects sitemap = false to exclude routes", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sm4-"));
    const modules = new Map<string, Record<string, unknown>>();
    modules.set("/app/private/page.tsx", {
      default: () => null,
      sitemap: false,
    });

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [
        {
          pattern: "/private",
          regex: /^\/private$/,
          paramNames: [],
          filePath: "/app/private/page.tsx",
          layoutPaths: [],
          type: "page",
        },
      ],
      modules,
      outDir: tmpDir,
    });

    const sitemap = fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf-8");
    expect(sitemap).not.toContain("/private");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("home page gets priority 1.0", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-sm5-"));

    await generateSitemap({
      baseUrl: "https://example.com",
      routes: [
        {
          pattern: "/",
          regex: /^\/$/,
          paramNames: [],
          filePath: "/app/page.tsx",
          layoutPaths: [],
          type: "page",
        },
      ],
      outDir: tmpDir,
    });

    const sitemap = fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf-8");
    expect(sitemap).toContain("<priority>1</priority>");

    fs.rmSync(tmpDir, { recursive: true });
  });
});
