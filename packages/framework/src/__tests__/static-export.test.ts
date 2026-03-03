import { describe, it, expect } from "vitest";
import {
  collectStaticRoutes,
  resolveOutputPath,
  renderStaticPage,
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

// ---------------------------------------------------------------------------
// renderStaticPage — full metadata pipeline
// ---------------------------------------------------------------------------

describe("renderStaticPage metadata", () => {
  it("renders full metadata including OG, robots, and icons", async () => {
    const mod = {
      default: () => null,
      metadata: {
        title: "My Page",
        description: "Page description",
        openGraph: { title: "OG Title", type: "website" },
        robots: { index: false, follow: false },
        icons: { icon: "/favicon.ico" },
        alternates: {
          canonical: "https://example.com",
          languages: { en: "/en", de: "/de" },
        },
      },
    };

    const html = await renderStaticPage(mod, {});
    expect(html).toContain("<title>My Page</title>");
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:type"');
    expect(html).toContain('name="robots"');
    expect(html).toContain("noindex");
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="de"');
  });

  it("resolves generateMetadata for dynamic pages", async () => {
    const mod = {
      default: () => null,
      generateMetadata: async ({ params }: { params: Record<string, string> }) => ({
        title: `Post: ${params.slug}`,
        openGraph: { title: `Post: ${params.slug}` },
      }),
    };

    const html = await renderStaticPage(mod, { slug: "hello" });
    expect(html).toContain("<title>Post: hello</title>");
    expect(html).toContain('property="og:title"');
    expect(html).toContain("Post: hello");
  });

  it("renders empty head gracefully when no metadata", async () => {
    const mod = { default: () => null };
    const html = await renderStaticPage(mod, {});
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<div id="root">');
    // No metadata tags beyond the default viewport
    expect(html).not.toContain('name="description"');
  });
});
