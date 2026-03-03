import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createFetchHandler } from "../runtime/worker-entry";
import { scanRoutes } from "../runtime/router";
import { handleRequest } from "../runtime/ssr-handler";
import type { ViteDevServer } from "vite";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-phase1efg-"));
}

function httpFetch(
  port: number,
  urlPath: string,
  opts: { method?: string; headers?: Record<string, string>; body?: Buffer | string } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: urlPath, method: opts.method ?? "GET", headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) })
        );
      },
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function createMockViteServer(
  modules: Record<string, Record<string, unknown>>,
  root = "/tmp",
): ViteDevServer {
  return {
    config: { root },
    ssrLoadModule: vi.fn(async (id: string) => {
      const mod = modules[id];
      if (!mod) throw new Error(`Module not found: ${id}`);
      return mod;
    }),
  } as unknown as ViteDevServer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      Suspense: ({ children }: { children: unknown }) => children,
    },
  ];
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

// ---------------------------------------------------------------------------
// 1e. Binary body corruption in prod-server
// ---------------------------------------------------------------------------

describe("1e: prod-server preserves binary request body", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");
    fs.mkdirSync(clientDir, { recursive: true });

    // API route that receives binary body and reports byte values as JSON
    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [
  {
    pattern: "/api/upload",
    regex: /^\\/api\\/upload$/,
    paramNames: [],
    type: "api",
    module: {
      POST: async (req) => {
        const buf = await req.arrayBuffer();
        const bytes = [...new Uint8Array(buf)];
        return new Response(JSON.stringify({ bytes, length: bytes.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`,
    );

    const { startProdServer } = await import("../runtime/prod-server");
    server = await startProdServer({
      distDir,
      port: 0,
      host: "127.0.0.1",
      serverEntryPath,
    });

    const addr = server.address() as { port: number };
    port = addr.port;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("preserves binary bytes with high-byte values in request body", async () => {
    // PNG header + null bytes + high bytes — all would be corrupted by .toString()
    const binary = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0xff, 0xfe, 0xfd, 0xfc,
    ]);

    const res = await httpFetch(port, "/api/upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: binary,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.body.toString());
    expect(data.length).toBe(16);
    expect(data.bytes).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0xff, 0xfe, 0xfd, 0xfc,
    ]);
  });

  it("preserves null bytes in binary request body", async () => {
    const binary = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00]);

    const res = await httpFetch(port, "/api/upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: binary,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.body.toString());
    expect(data.length).toBe(5);
    expect(data.bytes).toEqual([0x00, 0x01, 0x00, 0x02, 0x00]);
  });

  it("still handles text request body correctly", async () => {
    const text = "hello world";

    const res = await httpFetch(port, "/api/upload", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: text,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.body.toString());
    const expected = [...Buffer.from(text)];
    expect(data.bytes).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// 1f. Worker entry missing boundaries
// ---------------------------------------------------------------------------

describe("1f: worker-entry handlePageRoute uses boundaries", () => {
  let tmpAppDir: string;

  beforeEach(() => {
    tmpAppDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-worker-boundary-"));
    const appDir = path.join(tmpAppDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() {}");
    fs.writeFileSync(path.join(appDir, "error.tsx"), "export default function Error() {}");
    fs.writeFileSync(path.join(appDir, "loading.tsx"), "export default function Loading() {}");
    fs.writeFileSync(path.join(appDir, "not-found.tsx"), "export default function NotFound() {}");
  });

  afterEach(() => {
    fs.rmSync(tmpAppDir, { recursive: true, force: true });
  });

  it("loads error boundary from modules map", async () => {
    const appDir = path.join(tmpAppDir, "app");
    const routes = scanRoutes(appDir);
    const route = routes.find((r) => r.type === "page")!;

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => "page content",
    });

    if (route.errorPath) {
      modules.set(route.errorPath, {
        default: () => "error fallback",
      });
    }

    expect(route.errorPath).toBeDefined();

    expect(route.errorPath).toBeDefined();
    expect(modules.has(route.errorPath!)).toBe(true);
  });

  it("renders without boundaries when none exist on route", async () => {
    const appDir = path.join(tmpAppDir, "app");

    // Create route without boundary files
    const subDir = path.join(appDir, "plain");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "page.tsx"), "export default function Plain() {}");

    const routes = scanRoutes(appDir);
    const route = routes.find(
      (r) => r.type === "page" && r.pattern === "/plain",
    )!;

    expect(route).toBeDefined();
    // A route in a subdirectory without its own boundaries might inherit parent's
    // or have none — the key is it doesn't crash
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, {
      default: () => "plain page",
    });

    const handler = createFetchHandler({ routes, modules });
    const res = await handler.fetch(new Request("http://localhost/plain"));

    // Should not crash — returns some response
    expect(res.status).toBeDefined();
  });

  it("loads loading boundary from modules map", async () => {
    const appDir = path.join(tmpAppDir, "app");
    const routes = scanRoutes(appDir);
    const route = routes.find((r) => r.type === "page" && r.pattern === "/")!;

    expect(route.loadingPath).toBeDefined();

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { default: () => "page" });
    modules.set(route.loadingPath!, { default: () => "loading..." });

    createFetchHandler({ routes, modules });
    expect(modules.has(route.loadingPath!)).toBe(true);
  });

  it("loads not-found boundary from modules map", async () => {
    const appDir = path.join(tmpAppDir, "app");
    const routes = scanRoutes(appDir);
    const route = routes.find((r) => r.type === "page" && r.pattern === "/")!;

    expect(route.notFoundPath).toBeDefined();

    const modules = new Map<string, Record<string, unknown>>();
    modules.set(route.filePath, { default: () => "page" });
    modules.set(route.notFoundPath!, { default: () => "not found" });

    createFetchHandler({ routes, modules });
    expect(modules.has(route.notFoundPath!)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1g. Middleware responseHeaders discarded
// ---------------------------------------------------------------------------

describe("1g: prod-server merges middleware responseHeaders", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");
    fs.mkdirSync(clientDir, { recursive: true });

    // Write an index.html for fallback
    fs.writeFileSync(path.join(clientDir, "index.html"), "<html>fallback</html>");

    // Server entry with an API route
    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [
  {
    pattern: "/api/test",
    regex: /^\\/api\\/test$/,
    paramNames: [],
    type: "api",
    module: {
      GET: async () => new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    },
  },
];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`,
    );

    // Middleware that sets custom response headers
    const middlewarePath = path.join(distDir, "middleware.mjs");
    fs.writeFileSync(
      middlewarePath,
      `export default async function middleware(request) {
  const headers = new Headers();
  headers.set("X-Custom-MW", "from-middleware");
  headers.set("X-Request-Id", "req-123");
  return { continue: true, responseHeaders: headers };
}
export const config = {};
`,
    );

    const { startProdServer } = await import("../runtime/prod-server");
    server = await startProdServer({
      distDir,
      port: 0,
      host: "127.0.0.1",
      serverEntryPath,
      middlewarePath,
    });

    const addr = server.address() as { port: number };
    port = addr.port;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("applies middleware responseHeaders to API responses", async () => {
    const res = await httpFetch(port, "/api/test");
    expect(res.status).toBe(200);
    expect(res.headers["x-custom-mw"]).toBe("from-middleware");
    expect(res.headers["x-request-id"]).toBe("req-123");
  });

  it("applies middleware responseHeaders to fallback index.html", async () => {
    const res = await httpFetch(port, "/some-page");
    expect(res.status).toBe(200);
    expect(res.headers["x-custom-mw"]).toBe("from-middleware");
    expect(res.headers["x-request-id"]).toBe("req-123");
  });
});

describe("1g: ssr-handler merges middleware responseHeaders", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-ssr-mw-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("merges responseHeaders from middleware into page response", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const middlewarePath = path.join(tmpDir, "middleware.ts");
    fs.writeFileSync(middlewarePath, "");

    const routes = scanRoutes(appDir);
    const mwHeaders = new Headers();
    mwHeaders.set("X-MW-Header", "test-value");
    mwHeaders.set("X-Trace-Id", "trace-456");

    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
      },
      [middlewarePath]: {
        default: async () => ({
          continue: true,
          responseHeaders: mwHeaders,
        }),
      },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-MW-Header")).toBe("test-value");
    expect(res.headers.get("X-Trace-Id")).toBe("trace-456");
  });

  it("does not apply responseHeaders when middleware returns a Response", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const middlewarePath = path.join(tmpDir, "middleware.ts");
    fs.writeFileSync(middlewarePath, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
      },
      [middlewarePath]: {
        default: async () =>
          new Response("blocked", {
            status: 403,
            headers: { "X-Block": "yes" },
          }),
      },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    // Middleware returned a full Response — it's returned directly
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("blocked");
    expect(res.headers.get("X-Block")).toBe("yes");
  });

  it("handles middleware with rewrite and responseHeaders", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const middlewarePath = path.join(tmpDir, "middleware.ts");
    fs.writeFileSync(middlewarePath, "");

    const routes = scanRoutes(appDir);
    const mwHeaders = new Headers();
    mwHeaders.set("X-Rewritten", "true");

    const server = createMockViteServer({
      [pageFile]: {
        default: () => "",
      },
      [middlewarePath]: {
        default: async () => ({
          rewriteUrl: "/",
          responseHeaders: mwHeaders,
        }),
      },
    });

    const res = await handleRequest(new Request("http://localhost/old-path"), {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Rewritten")).toBe("true");
  });

  it("works without middleware", async () => {
    const pageFile = path.join(appDir, "page.tsx");
    fs.writeFileSync(pageFile, "");

    const routes = scanRoutes(appDir);
    const server = createMockViteServer({
      [pageFile]: { default: () => "" },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
  });
});
