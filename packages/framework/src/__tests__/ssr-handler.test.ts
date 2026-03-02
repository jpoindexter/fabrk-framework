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
