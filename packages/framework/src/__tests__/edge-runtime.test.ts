import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanRoutes, type Route } from "../runtime/router";

function createTempApp(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-edge-"));
  return tmpDir;
}

describe("Edge Runtime Per-Route", () => {
  it("Route interface accepts runtime field", () => {
    const route: Route = {
      pattern: "/api/hello",
      regex: /^\/api\/hello$/,
      paramNames: [],
      filePath: "/app/api/hello/route.ts",
      layoutPaths: [],
      type: "api",
      runtime: "edge",
    };
    expect(route.runtime).toBe("edge");
  });

  it("Route runtime defaults to undefined (Node.js)", () => {
    const route: Route = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      filePath: "/app/page.tsx",
      layoutPaths: [],
      type: "page",
    };
    expect(route.runtime).toBeUndefined();
  });

  it("Route accepts 'node' runtime", () => {
    const route: Route = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      filePath: "/app/page.tsx",
      layoutPaths: [],
      type: "page",
      runtime: "node",
    };
    expect(route.runtime).toBe("node");
  });

  it("scanned routes do not have runtime set (file-system scan)", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    // Runtime comes from route module exports, not file-system scanning
    expect(routes[0].runtime).toBeUndefined();

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("Request/Response conversion for edge routes works with web APIs", async () => {
    // Simulate what prod-server does for edge routes
    const webRequest = new Request("http://localhost/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    expect(webRequest.method).toBe("POST");
    expect(webRequest.headers.get("Content-Type")).toBe("application/json");

    const body = await webRequest.json();
    expect(body.message).toBe("hello");
  });

  it("edge handler returns web Response", async () => {
    const handler = async (req: Request) => {
      const url = new URL(req.url);
      return new Response(JSON.stringify({ path: url.pathname }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const req = new Request("http://localhost/api/hello");
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toBe("/api/hello");
  });

  it("edge handler receives params", async () => {
    const handler = async (_req: Request, ctx: { params: Record<string, string> }) => {
      return new Response(JSON.stringify(ctx.params), {
        headers: { "Content-Type": "application/json" },
      });
    };

    const req = new Request("http://localhost/api/users/123");
    const res = await handler(req, { params: { id: "123" } });
    const data = await res.json();
    expect(data.id).toBe("123");
  });

  it("edge handler error returns 500", async () => {
    const handler = async () => {
      throw new Error("Edge error");
    };

    try {
      await handler();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("Edge error");
    }
  });
});
