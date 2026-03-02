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

function mockReactLoader(reactDomServer: Record<string, unknown>) {
  return async (): Promise<[unknown, unknown]> => [
    reactDomServer,
    { createElement: vi.fn((_type: unknown, _props: unknown) => ({})) },
  ];
}

describe("Streaming SSR", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-stream-test-"));
    fs.mkdirSync(path.join(tmpDir, "app"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "app", "page.tsx"),
      'export default function Home() { return "Hello"; }'
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("uses streaming SSR when renderToReadableStream is available", async () => {
    const routes = scanRoutes(path.join(tmpDir, "app"));
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");

    const streamContent = new TextEncoder().encode("<div>streamed</div>");
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(streamContent);
        controller.close();
      },
    });

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
      _reactLoader: mockReactLoader({
        renderToReadableStream: vi.fn().mockResolvedValue(mockStream),
        renderToString: vi.fn().mockReturnValue("<div>non-streamed</div>"),
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Transfer-Encoding")).toBe("chunked");

    const html = await res.text();
    expect(html).toContain("<div>streamed</div>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<div id="root">');
  });

  it("falls back to renderToString when renderToReadableStream is unavailable", async () => {
    const routes = scanRoutes(path.join(tmpDir, "app"));
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");

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
      _reactLoader: mockReactLoader({
        renderToString: vi.fn().mockReturnValue("<div>Hello</div>"),
      }),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<div>Hello</div>");
    expect(res.headers.get("Transfer-Encoding")).toBeNull();
  });

  it("streaming response includes complete HTML shell", async () => {
    const routes = scanRoutes(path.join(tmpDir, "app"));
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");

    const streamContent = new TextEncoder().encode("<p>content</p>");
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(streamContent);
        controller.close();
      },
    });

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() {
          return "test";
        },
        metadata: { title: "Test Page", description: "A test" },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader({
        renderToReadableStream: vi.fn().mockResolvedValue(mockStream),
      }),
    });

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Test Page</title>");
    expect(html).toContain('content="A test"');
    expect(html).toContain('<div id="root">');
    expect(html).toContain("<p>content</p>");
    expect(html).toContain("</html>");
  });

  it("streaming handles multi-chunk responses", async () => {
    const routes = scanRoutes(path.join(tmpDir, "app"));
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");

    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("<div>chunk1"));
        controller.enqueue(encoder.encode("chunk2</div>"));
        controller.close();
      },
    });

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() {
          return "test";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader({
        renderToReadableStream: vi.fn().mockResolvedValue(mockStream),
      }),
    });

    const html = await res.text();
    expect(html).toContain("<div>chunk1chunk2</div>");
  });

  it("returns 500 when neither renderToReadableStream nor renderToString is available", async () => {
    const routes = scanRoutes(path.join(tmpDir, "app"));
    const pageFilePath = path.join(tmpDir, "app", "page.tsx");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const server = createMockViteServer({
      [pageFilePath]: {
        default: function Page() {
          return "test";
        },
      },
    });

    const req = new Request("http://localhost/");
    const res = await handleRequest(req, {
      routes,
      viteServer: server,
      _reactLoader: mockReactLoader({}),
    });

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("React SSR modules not available");

    consoleSpy.mockRestore();
  });
});
