import { describe, it, expect, vi } from "vitest";
import { handleRequest } from "../runtime/ssr-handler";
import type { Route } from "../runtime/router";

// Mock ViteDevServer
function createMockViteServer(modules: Record<string, Record<string, unknown>>) {
  return {
    ssrLoadModule: vi.fn(async (path: string) => {
      if (modules[path]) return modules[path];
      throw new Error(`Module not found: ${path}`);
    }),
    config: { root: "/tmp/test-project" },
    transformIndexHtml: vi.fn(async (_url: string, html: string) => html),
  };
}

const baseRoute: Route = {
  pattern: "/about",
  regex: /^\/about$/,
  paramNames: [],
  filePath: "/app/about/page.tsx",
  layoutPaths: [],
  type: "page",
};

const apiRoute: Route = {
  pattern: "/api/hello",
  regex: /^\/api\/hello$/,
  paramNames: [],
  filePath: "/app/api/hello/route.ts",
  layoutPaths: [],
  type: "api",
};

describe("RSC Pipeline", () => {
  describe(".rsc URL detection", () => {
    it("strips .rsc suffix and matches route", async () => {
      const mockServer = createMockViteServer({
        "/app/about/page.tsx": {
          default: () => "About page",
        },
        "virtual:fabrk/entry-rsc": {
          renderRsc: () => new ReadableStream(),
        },
      });

      const req = new Request("http://localhost/about.rsc");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
        _reactLoader: async () => {
          const React = await import("react");
          return [{}, React];
        },
      });

      // Should attempt RSC render (may fail since we're mocking, but should not 404)
      expect(res.status).not.toBe(404);
    });

    it("returns 404 for .rsc URL with no matching route", async () => {
      const mockServer = createMockViteServer({});

      const req = new Request("http://localhost/nonexistent.rsc");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
      });

      expect(res.status).toBe(404);
    });

    it("does not apply .rsc handling to API routes", async () => {
      const mockServer = createMockViteServer({
        "/app/api/hello/route.ts": {
          GET: () => new Response(JSON.stringify({ ok: true })),
        },
      });

      const req = new Request("http://localhost/api/hello");
      const res = await handleRequest(req, {
        routes: [apiRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
      });

      expect(res.status).toBe(200);
    });
  });

  describe("RSC payload response", () => {
    it("returns text/x-component content type for .rsc requests", async () => {
      const mockRscStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("rsc-payload"));
          controller.close();
        },
      });

      const mockServer = createMockViteServer({
        "/app/about/page.tsx": {
          default: () => "About",
        },
        "virtual:fabrk/entry-rsc": {
          renderRsc: () => mockRscStream,
        },
      });

      const req = new Request("http://localhost/about.rsc");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
        _reactLoader: async () => {
          const React = await import("react");
          return [{}, React];
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/x-component");
    });

    it("includes security headers on RSC responses", async () => {
      const mockRscStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const mockServer = createMockViteServer({
        "/app/about/page.tsx": {
          default: () => "About",
        },
        "virtual:fabrk/entry-rsc": {
          renderRsc: () => mockRscStream,
        },
      });

      const req = new Request("http://localhost/about.rsc");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
        _reactLoader: async () => {
          const React = await import("react");
          return [{}, React];
        },
      });

      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("RSC fallback to basic SSR", () => {
    it("falls through to basic SSR when rsc option is false", async () => {
      const React = await import("react");
      const mockServer = createMockViteServer({
        "/app/about/page.tsx": {
          default: () => React.createElement("div", null, "About Page"),
        },
      });

      const req = new Request("http://localhost/about");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: false,
        _reactLoader: async () => {
          const reactDomServer = await import("react-dom/server");
          return [reactDomServer, React];
        },
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("About Page");
    });

    it("falls through to basic SSR when RSC modules fail to load", async () => {
      const React = await import("react");
      const mockServer = createMockViteServer({
        "/app/about/page.tsx": {
          default: () => React.createElement("div", null, "About Fallback"),
        },
        // No virtual:fabrk/entry-rsc → RSC modules will fail to load
      });

      const req = new Request("http://localhost/about");
      const res = await handleRequest(req, {
        routes: [baseRoute],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viteServer: mockServer as any,
        rsc: true,
        _reactLoader: async () => {
          const reactDomServer = await import("react-dom/server");
          return [reactDomServer, React];
        },
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("About Fallback");
    });
  });

  describe("plugin virtual modules", () => {
    it("entry-client code includes RSC navigation function", async () => {
      const { fabrkPlugin } = await import("../runtime/plugin");
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string },
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-client");

      expect(code).toContain("__FABRK_RSC_NAVIGATE__");
      expect(code).toContain(".rsc");
      expect(code).toContain("startTransition");
    });

    it("entry-rsc code exports renderRsc and createClientManifest", async () => {
      const { fabrkPlugin } = await import("../runtime/plugin");
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string },
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-rsc");

      expect(code).toContain("renderRsc");
      expect(code).toContain("createClientManifest");
    });
  });
});
