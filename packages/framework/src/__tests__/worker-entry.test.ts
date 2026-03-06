import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFetchHandler } from "../runtime/worker-entry";
import { scanRoutes, type Route } from "../runtime/router";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function createRoutes(tmpDir: string): Route[] {
  fs.mkdirSync(path.join(tmpDir, "app"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "app", "api", "hello"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "app", "blog", "[slug]"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "app", "page.tsx"), "export default function Home() {}");
  fs.writeFileSync(path.join(tmpDir, "app", "api", "hello", "route.ts"), "export function GET() {}");
  fs.writeFileSync(path.join(tmpDir, "app", "blog", "[slug]", "page.tsx"), "export default function Post() {}");

  return scanRoutes(path.join(tmpDir, "app"));
}

describe("Fetch Handler (Edge/Worker)", () => {
  let tmpDir: string;
  let routes: Route[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-worker-test-"));
    routes = createRoutes(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("returns a handler with fetch method", () => {
    const handler = createFetchHandler({ routes });
    expect(typeof handler.fetch).toBe("function");
  });

  it("returns 404 for unmatched routes", async () => {
    const handler = createFetchHandler({ routes });
    const res = await handler.fetch(new Request("http://localhost/unknown"));

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });

  it("includes security headers on 404", async () => {
    const handler = createFetchHandler({ routes });
    const res = await handler.fetch(new Request("http://localhost/unknown"));

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("returns 501 when modules Map is not provided", async () => {
    const handler = createFetchHandler({ routes });
    const res = await handler.fetch(new Request("http://localhost/"));

    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toBe("Route module not available");
  });

  it("returns 501 for API routes without modules Map", async () => {
    const handler = createFetchHandler({ routes });
    const res = await handler.fetch(new Request("http://localhost/api/hello"));

    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toBe("Route module not available");
  });

  it("returns 501 for dynamic routes without modules Map", async () => {
    const handler = createFetchHandler({ routes });
    const res = await handler.fetch(new Request("http://localhost/blog/hello-world"));

    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toBe("Route module not available");
  });

  it("dispatches API route to correct method handler", async () => {
     
    const apiRoute = routes.find((r) => r.type === "api")!;
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(apiRoute.filePath, {
      GET: (_req: Request, ctx: { params: Record<string, string> }) =>
        new Response(JSON.stringify({ ok: true, params: ctx.params }), {
          headers: { "Content-Type": "application/json" },
        }),
    });

    const handler = createFetchHandler({ routes, modules });
    const res = await handler.fetch(new Request("http://localhost/api/hello"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 405 for unsupported API methods", async () => {
     
    const apiRoute = routes.find((r) => r.type === "api")!;
    const modules = new Map<string, Record<string, unknown>>();
    modules.set(apiRoute.filePath, {
      GET: () => new Response("ok"),
    });

    const handler = createFetchHandler({ routes, modules });
    const res = await handler.fetch(
      new Request("http://localhost/api/hello", { method: "DELETE" })
    );

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data.error).toContain("DELETE");
  });

  it("runs middleware before routing", async () => {
    const middleware = vi.fn().mockResolvedValue(
      new Response("blocked", { status: 403 })
    );

    const handler = createFetchHandler({ routes, middleware });
    const res = await handler.fetch(new Request("http://localhost/"));

    expect(middleware).toHaveBeenCalled();
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("blocked");
  });

  it("continues routing when middleware returns null", async () => {
    const middleware = vi.fn().mockResolvedValue(null);

    const handler = createFetchHandler({ routes, middleware });
    const res = await handler.fetch(new Request("http://localhost/"));

    expect(middleware).toHaveBeenCalled();
    // Falls through to routing — 501 since no modules
    expect(res.status).toBe(501);
  });

  it("delegates to static asset handler when provided", async () => {
    const mockAssetResponse = new Response("static content", { status: 200 });
    const getAsset = vi.fn().mockResolvedValue(mockAssetResponse);

    const handler = createFetchHandler({ routes, getAsset });
    const req = new Request("http://localhost/style.css");
    const res = await handler.fetch(req);

    expect(getAsset).toHaveBeenCalledWith(req);
    expect(res).toBe(mockAssetResponse);
  });

  it("continues to routing when getAsset returns null", async () => {
    const getAsset = vi.fn().mockResolvedValue(null);

    const handler = createFetchHandler({ routes, getAsset });
    const res = await handler.fetch(new Request("http://localhost/"));

    expect(getAsset).toHaveBeenCalled();
    expect(res.status).toBe(501);
  });
});
