import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ViteDevServer } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleRequest } from "../runtime/ssr-handler";
import { scanRoutes } from "../runtime/router";

function createMockViteServer(
  modules: Record<string, Record<string, unknown>>,
  root = "/tmp"
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
      renderToString: vi.fn().mockReturnValue("<div>Hello</div>"),
    },
    {
      createElement: vi.fn((_type: unknown, _props: unknown) => ({})),
    },
  ];
}

describe("Middleware", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-mw-test-"));
    fs.mkdirSync(path.join(tmpDir, "app"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "app", "page.tsx"),
      'export default function Home() { return "Hello"; }'
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("middleware can short-circuit with a Response", async () => {
    const middlewarePath = path.join(tmpDir, "app", "middleware.ts");
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    const server = createMockViteServer({
      [middlewarePath]: {
        default: () => new Response("Blocked by middleware", { status: 403 }),
      },
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      middlewarePath,
    });

    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Blocked by middleware");
  });

  it("middleware returning undefined continues to route handler", async () => {
    const middlewarePath = path.join(tmpDir, "app", "middleware.ts");
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    const server = createMockViteServer({
      [middlewarePath]: {
        default: () => undefined,
      },
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<div>Hello</div>");
  });

  it("request continues normally when no middlewarePath is provided", async () => {
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
  });

  it("middleware errors return 500 — request does not continue unauthenticated", async () => {
    const middlewarePath = path.join(tmpDir, "app", "middleware.ts");
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(500);
  });

  it("async middleware is awaited", async () => {
    const middlewarePath = path.join(tmpDir, "app", "middleware.ts");
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    const server = createMockViteServer({
      [middlewarePath]: {
        default: async (_req: Request) => {
          await new Promise((r) => setTimeout(r, 10));
          return new Response("Async blocked", { status: 401 });
        },
      },
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      middlewarePath,
    });

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Async blocked");
  });

  it("middleware receives the original request", async () => {
    const middlewarePath = path.join(tmpDir, "app", "middleware.ts");
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");
    const routes = scanRoutes(path.join(tmpDir, "app"));

    let receivedUrl = "";
    let receivedMethod = "";

    const server = createMockViteServer({
      [middlewarePath]: {
        default: (req: Request) => {
          receivedUrl = req.url;
          receivedMethod = req.method;
          return undefined;
        },
      },
      [pageFilePath]: {
        default: function Home() {
          return "Hello";
        },
      },
    });

    const req = new Request("http://localhost/", { method: "POST" });
    await handleRequest(req, {
      routes,
      viteServer: server,
      middlewarePath,
      _reactLoader: mockReactLoader(),
    });

    expect(receivedUrl).toBe("http://localhost/");
    expect(receivedMethod).toBe("POST");
  });
});
