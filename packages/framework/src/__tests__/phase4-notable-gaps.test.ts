import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleRequest } from "../runtime/ssr-handler";
import { scanRoutes } from "../runtime/router";
import { compileMatcher } from "../runtime/middleware";
import { createMCPServer } from "../tools/mcp/server";
import { handleImageRequest } from "../runtime/image-handler";
import type { ViteDevServer } from "vite";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

 
function mockReactLoader(): () => Promise<[any, any]> {
  return async () => [
    { renderToString: vi.fn().mockReturnValue("<div>Hello</div>") },
    { createElement: vi.fn((_type: unknown, _props: unknown) => ({})) },
  ];
}

// ---------------------------------------------------------------------------
// 4a: Route-level headers() export
// ---------------------------------------------------------------------------

describe("Route-level headers() export", () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-headers-"));
    appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function P() {}");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("merges headers() export into SSR response", async () => {
    const pageFilePath = path.join(appDir, "page.tsx");
    const routes = scanRoutes(appDir);

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() { return "Hello"; },
        headers: () => ({
          "X-Custom": "value",
          "Cache-Control": "max-age=3600",
        }),
      },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Custom")).toBe("value");
    expect(res.headers.get("Cache-Control")).toBe("max-age=3600");
  });

  it("handles async headers() export", async () => {
    const pageFilePath = path.join(appDir, "page.tsx");
    const routes = scanRoutes(appDir);

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() { return "Hello"; },
        headers: async () => ({ "X-Async": "yes" }),
      },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader(),
    });

    expect(res.headers.get("X-Async")).toBe("yes");
  });

  it("ignores throwing headers() gracefully", async () => {
    const pageFilePath = path.join(appDir, "page.tsx");
    const routes = scanRoutes(appDir);

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() { return "Hello"; },
        headers: () => { throw new Error("boom"); },
      },
    });

    const res = await handleRequest(new Request("http://localhost/"), {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader(),
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 4b: Middleware wildcard glob fix
// ---------------------------------------------------------------------------

describe("Middleware wildcard glob fix", () => {
  it("single * matches one path segment only", () => {
    const re = compileMatcher("/api/*");
    expect(re.test("/api/users")).toBe(true);
    expect(re.test("/api/posts")).toBe(true);
    // Must NOT match nested segments
    expect(re.test("/api/users/123")).toBe(false);
  });

  it("double ** matches multiple path segments", () => {
    const re = compileMatcher("/api/**");
    expect(re.test("/api/users")).toBe(true);
    expect(re.test("/api/users/123")).toBe(true);
    expect(re.test("/api/users/123/posts")).toBe(true);
  });

  it("** does not trigger ReDoS rejection", () => {
    expect(() => compileMatcher("/api/**")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4c: notifications/initialized in MCP server
// ---------------------------------------------------------------------------

describe("MCP notifications/initialized", () => {
  it("returns undefined for notifications/initialized (no error)", async () => {
    const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(result).toBeUndefined();
  });

  it("httpHandler returns 204 for notification", async () => {
    const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
    const res = await server.httpHandler(
      new Request("http://localhost/__mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      }),
    );
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// 4d: Animated GIF passthrough in image handler
// ---------------------------------------------------------------------------

describe("GIF passthrough in image handler", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-gif-"));
    // Write a minimal GIF89a header as a fake GIF file
    const gifHeader = Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;");
    fs.writeFileSync(path.join(tmpDir, "animation.gif"), gifHeader);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("serves GIF without sharp processing", async () => {
    const req = new Request(
      "http://localhost/_fabrk/image?url=/animation.gif&w=800&q=75",
    );
    const res = await handleImageRequest(req, tmpDir);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
    expect(res.headers.get("Cache-Control")).toContain("immutable");

    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });
});
