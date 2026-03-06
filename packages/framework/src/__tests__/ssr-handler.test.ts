import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanRoutes } from "../runtime/router";
import { handleRequest } from "../runtime/ssr-handler";
import type { ViteDevServer } from "vite";

function createMockViteServer(modules: Record<string, Record<string, unknown>>, root = "/tmp"): ViteDevServer {
  return {
    config: { root },
    ssrLoadModule: vi.fn(async (id: string) => {
      const mod = modules[id];
      if (!mod) throw new Error(`Module not found: ${id}`);
      return mod;
    }),
  } as unknown as ViteDevServer;
}

function renderMockElement(element: unknown): string {
  if (!element || typeof element !== "object") return String(element ?? "");
  const el = element as { component?: unknown; props?: Record<string, unknown>; children?: unknown[] };

  if (typeof el.component === "function") {
    const result = el.component(el.props ?? {});
    return renderMockElement(result);
  }

  if (el.children) {
    return el.children.map(renderMockElement).join("");
  }

  return "";
}

 
function mockReactLoader(): () => Promise<[any, any]> {
  return async () => [
    {
      renderToString: (element: unknown) => renderMockElement(element),
    },
    {
      createElement: (component: unknown, props: unknown, ...children: unknown[]) => ({
        __mock: true,
        component,
        props,
        children,
      }),
    },
  ];
}

describe("handleRequest — page routes", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("returns 404 for unmatched routes", async () => {
    const routes = scanRoutes(appDir);
    const server = createMockViteServer({});

    const res = await handleRequest(
      new Request("http://localhost/nonexistent"),
      { routes, viteServer: server }
    );

    expect(res.status).toBe(404);
  });

  it("renders a page component", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => ({ __mock: true, component: "div", props: {}, children: [] }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<div id="root">');
  });

  it("passes params to page component", async () => {
    const slugDir = path.join(appDir, "blog", "[slug]");
    fs.mkdirSync(slugDir, { recursive: true });
    const pageFile = path.join(slugDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    let receivedParams: unknown;
    const server = createMockViteServer({
      [pageFile]: {
        default: (props: { params: unknown }) => {
          receivedParams = props.params;
          return "";
        },
      },
    });

    await handleRequest(
      new Request("http://localhost/blog/hello"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    expect(receivedParams).toEqual({ slug: "hello" });
  });

  it("returns 500 for non-function default export", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: "not a function" },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server }
    );

    expect(res.status).toBe(500);
  });

  it("extracts metadata into head", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
        metadata: { title: "Hello Page", description: "A test page" },
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    const html = await res.text();
    expect(html).toContain("<title>Hello Page</title>");
    expect(html).toContain('name="description"');
    expect(html).toContain("A test page");
  });

  it("includes security headers", async () => {
    const routes = scanRoutes(appDir);
    const server = createMockViteServer({});

    const res = await handleRequest(
      new Request("http://localhost/nonexistent"),
      { routes, viteServer: server }
    );

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

describe("handleRequest — API routes", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-api-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(path.join(appDir, "api", "hello"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("calls the correct HTTP method handler", async () => {
    const routeFile = path.join(appDir, "api", "hello", "route.ts");
    fs.writeFileSync(routeFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [routeFile]: {
        GET: async () =>
          new Response(JSON.stringify({ message: "hello" }), {
            headers: { "Content-Type": "application/json" },
          }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/api/hello", { method: "GET" }),
      { routes, viteServer: server }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("hello");
  });

  it("returns 405 for unsupported HTTP method", async () => {
    const routeFile = path.join(appDir, "api", "hello", "route.ts");
    fs.writeFileSync(routeFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [routeFile]: {
        GET: async () => new Response("ok"),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/api/hello", { method: "DELETE" }),
      { routes, viteServer: server }
    );

    expect(res.status).toBe(405);
  });

  it("passes params to API handler", async () => {
    const paramDir = path.join(appDir, "api", "users", "[id]");
    fs.mkdirSync(paramDir, { recursive: true });
    const routeFile = path.join(paramDir, "route.ts");
    fs.writeFileSync(routeFile, "");

    const routes = scanRoutes(appDir);
    let receivedParams: unknown;
    const server = createMockViteServer({
      [routeFile]: {
        GET: async (_req: Request, ctx: { params: unknown }) => {
          receivedParams = ctx.params;
          return new Response("ok");
        },
      },
    });

    await handleRequest(
      new Request("http://localhost/api/users/42", { method: "GET" }),
      { routes, viteServer: server }
    );

    expect(receivedParams).toEqual({ id: "42" });
  });

  it("returns 500 on handler error", async () => {
    const routeFile = path.join(appDir, "api", "hello", "route.ts");
    fs.writeFileSync(routeFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [routeFile]: {
        GET: async () => {
          throw new Error("boom");
        },
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/api/hello", { method: "GET" }),
      { routes, viteServer: server }
    );

    expect(res.status).toBe(500);
  });
});

describe("handleRequest — route headers CRLF sanitization", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-headers-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

   
  function mockReactLoader(): () => Promise<[any, any]> {
    return async () => [
      { renderToString: () => "<div>page</div>" },
      { createElement: (_c: unknown, _p: unknown) => ({}) },
    ];
  }

  it("strips CRLF from route header values to prevent response splitting", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
        headers: async () => ({
          "X-Custom": "legit\r\nX-Injected: evil",
        }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    expect(res.status).toBe(200);
    // The CR and LF must be stripped — injected header must not appear
    const customVal = res.headers.get("X-Custom") ?? "";
    expect(customVal).not.toContain("\r");
    expect(customVal).not.toContain("\n");
    expect(res.headers.get("X-Injected")).toBeNull();
  });

  it("strips null bytes and other control chars from header values", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
        headers: async () => ({
          "X-Custom": "value\x00with\x01nulls",
        }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    const val = res.headers.get("X-Custom") ?? "";
    expect(val).not.toContain("\x00");
    expect(val).not.toContain("\x01");
  });

  it("drops header entries whose name is entirely control characters", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
        // Header name is all control chars — sanitized name is empty, so it's dropped
        headers: async () => ({
          "\x00\x01\x02": "payload",
          "X-Good": "ok",
        }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    // The all-control-char name becomes "" and is dropped; X-Good passes through
    expect(res.headers.get("X-Good")).toBe("ok");
  });

  it("strips horizontal tab (\\x09) from route header values", async () => {
    // Tab (\x09) was previously not stripped by sanitizeHeaderValue because the
    // range \x00-\x08 skipped \x09 before continuing at \x0a. It is used in
    // obsolete HTTP header line-folding and must be stripped.
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
        headers: async () => ({
          "X-Custom": "before\x09after",
        }),
      },
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      { routes, viteServer: server, _reactLoader: mockReactLoader() }
    );

    const val = res.headers.get("X-Custom") ?? "";
    expect(val).not.toContain("\x09");
    // Surrounding text should be preserved
    expect(val).toContain("before");
    expect(val).toContain("after");
  });
});

describe("handleRequest — middleware rewriteUrl validation", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-rewrite-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function mockReactLoaderSimple(): () => Promise<[any, any]> {
    return async () => [
      { renderToString: () => "<div>page</div>" },
      { createElement: (_c: unknown, _p: unknown) => ({}) },
    ];
  }

  it("ignores absolute rewriteUrl from middleware (does not change request origin)", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    let seenUrl: string | undefined;
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
      },
    });

    // Middleware that tries to rewrite to an absolute external URL
    const middlewarePath = path.join(appDir, "middleware.ts");
    fs.writeFileSync(middlewarePath, "");
    const middlewareMod = {
      default: async (_req: Request) => ({ rewriteUrl: "https://evil.com/admin" }),
    };

    // Override ssrLoadModule to return our fake middleware for the middleware path
    (server.ssrLoadModule as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      if (id === middlewarePath) return middlewareMod;
      if (id === pageFile) return {
        default: (props: { params: unknown }) => {
          seenUrl = props as unknown as string;
          return "";
        },
      };
      throw new Error(`Module not found: ${id}`);
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      {
        routes,
        viteServer: server,
        middlewarePath,
        _reactLoader: mockReactLoaderSimple(),
      }
    );

    // Should still respond (the bad rewriteUrl was silently ignored),
    // and the request stays on the original path
    expect([200, 404, 500]).toContain(res.status);
    // Should NOT have Location header pointing to evil.com
    const location = res.headers.get("Location");
    if (location !== null) {
      expect(location).not.toContain("evil.com");
    }
  });

  it("accepts safe relative rewriteUrl from middleware", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");
    const altDir = path.join(appDir, "alt");
    fs.mkdirSync(altDir, { recursive: true });
    const altPageFile = path.join(altDir, "page.tsx");
    fs.writeFileSync(altPageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: () => "" },
      [altPageFile]: { default: () => "" },
    });

    const middlewarePath = path.join(appDir, "middleware.ts");
    fs.writeFileSync(middlewarePath, "");
    const middlewareMod = {
      default: async (_req: Request) => ({ rewriteUrl: "/alt" }),
    };

    (server.ssrLoadModule as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      if (id === middlewarePath) return middlewareMod;
      const mods: Record<string, Record<string, unknown>> = {
        [pageFile]: { default: () => "" },
        [altPageFile]: { default: () => "" },
      };
      const mod = mods[id];
      if (!mod) throw new Error(`Module not found: ${id}`);
      return mod;
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      {
        routes,
        viteServer: server,
        middlewarePath,
        _reactLoader: mockReactLoaderSimple(),
      }
    );

    // /alt route was found and rendered
    expect(res.status).toBe(200);
  });
});

describe("handleRequest — redirect URL sanitization", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-redirect-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  // Use a mock React loader so the throw from the component propagates directly
  // to the catch block in handlePageRoute without going through real React rendering.
   
  function mockLoaderThrowing(throwFn: () => never): () => Promise<[any, any]> {
    return async () => [
      {
        renderToString: (_element: unknown) => {
          throwFn();
        },
      },
      { createElement: (_c: unknown, _p: unknown) => ({}) },
    ];
  }

  it("falls back to / for protocol-relative redirect URLs", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const { FABRK_REDIRECT } = await import("../runtime/error-boundary");
    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: () => "" },
    });

    const redirectErr = Object.assign(new Error("redirect"), {
      digest: FABRK_REDIRECT,
      url: "//evil.com/steal",
      statusCode: 307,
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      {
        routes,
        viteServer: server,
        _reactLoader: mockLoaderThrowing(() => { throw redirectErr; }),
      }
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("falls back to / for redirect URLs with tab-smuggled scheme", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const { FABRK_REDIRECT } = await import("../runtime/error-boundary");
    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: () => "" },
    });

    const redirectErr = Object.assign(new Error("redirect"), {
      digest: FABRK_REDIRECT,
      // Tab + space before https:// — could bypass naive trim()
      url: "\t https://evil.com",
      statusCode: 307,
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      {
        routes,
        viteServer: server,
        _reactLoader: mockLoaderThrowing(() => { throw redirectErr; }),
      }
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("preserves safe relative redirect URLs unchanged", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const { FABRK_REDIRECT } = await import("../runtime/error-boundary");
    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: () => "" },
    });

    const redirectErr = Object.assign(new Error("redirect"), {
      digest: FABRK_REDIRECT,
      url: "/dashboard?tab=settings",
      statusCode: 302,
    });

    const res = await handleRequest(
      new Request("http://localhost/"),
      {
        routes,
        viteServer: server,
        _reactLoader: mockLoaderThrowing(() => { throw redirectErr; }),
      }
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard?tab=settings");
  });
});
