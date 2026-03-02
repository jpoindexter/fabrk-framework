import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-prod-test-"));
}

function writeFile(dir: string, ...segments: string[]): string {
  const filePath = path.join(dir, ...segments);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `content-of-${segments.join("/")}`);
  return filePath;
}

function fetch(port: number, urlPath: string, opts: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
} = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: urlPath, method: opts.method ?? "GET", headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks).toString() })
        );
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Importable pure helpers — re-export internal functions for unit tests
// We test them via the server's behaviour (integration), but also test
// getMimeType and getCacheHeaders logic through static file serving.
// ---------------------------------------------------------------------------

// We can't import private functions directly. Instead we test their behaviour
// through the server's HTTP responses.

// ---------------------------------------------------------------------------
// Server lifecycle tests
// ---------------------------------------------------------------------------

describe("prod-server: static file serving", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");

    // Create test static files
    writeFile(clientDir, "index.html");
    writeFile(clientDir, "styles.css");
    writeFile(clientDir, "app.js");
    writeFile(clientDir, "image.png");
    writeFile(clientDir, "font.woff2");
    writeFile(clientDir, "chunk-abc12345.js");

    // Large compressible file (> 1024 bytes)
    const largeContent = "x".repeat(2000);
    const largePath = path.join(clientDir, "large.css");
    fs.mkdirSync(path.dirname(largePath), { recursive: true });
    fs.writeFileSync(largePath, largeContent);

    // Create minimal server entry module
    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`
    );

    const { startProdServer } = await import("../runtime/prod-server");
    server = await startProdServer({
      distDir,
      port: 0, // random port
      host: "127.0.0.1",
      serverEntryPath,
    });

    const addr = server.address() as { port: number };
    port = addr.port;
  });

  afterAll(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("serves CSS with correct MIME type", async () => {
    const res = await fetch(port, "/styles.css");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/css; charset=utf-8");
  });

  it("serves JS with correct MIME type", async () => {
    const res = await fetch(port, "/app.js");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/javascript; charset=utf-8");
  });

  it("serves PNG with correct MIME type", async () => {
    const res = await fetch(port, "/image.png");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("serves woff2 with correct MIME type", async () => {
    const res = await fetch(port, "/font.woff2");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("font/woff2");
  });

  it("returns octet-stream for unknown extensions", async () => {
    // Create a file with unknown ext
    const clientDir = path.join(distDir, "client");
    writeFile(clientDir, "data.xyz");
    const res = await fetch(port, "/data.xyz");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/octet-stream");
  });

  it("sets immutable cache for hashed filenames", async () => {
    const res = await fetch(port, "/chunk-abc12345.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("sets must-revalidate cache for unhashed filenames", async () => {
    const res = await fetch(port, "/app.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, no-cache, must-revalidate");
  });

  it("includes security headers on static responses", async () => {
    const res = await fetch(port, "/app.js");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("blocks path traversal attempts", async () => {
    const res = await fetch(port, "/../package.json");
    // Should fall through to 404 or index.html, not serve the file
    expect(res.body).not.toContain('"dependencies"');
  });

  it("blocks double-encoded path traversal", async () => {
    const res = await fetch(port, "/%2e%2e/package.json");
    expect(res.body).not.toContain('"dependencies"');
  });

  it("compresses large text files with gzip", async () => {
    const res = await fetch(port, "/large.css", {
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
  });

  it("compresses large text files with brotli when preferred", async () => {
    const res = await fetch(port, "/large.css", {
      headers: { "accept-encoding": "br, gzip" },
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("br");
  });

  it("does not compress small files", async () => {
    const res = await fetch(port, "/styles.css");
    expect(res.headers["content-encoding"]).toBeUndefined();
  });

  it("does not compress binary files", async () => {
    const res = await fetch(port, "/image.png", {
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.headers["content-encoding"]).toBeUndefined();
  });

  it("falls back to index.html for unmatched routes", async () => {
    const res = await fetch(port, "/nonexistent-page");
    expect(res.status).toBe(200);
    expect(res.body).toBe("content-of-index.html");
  });
});

// ---------------------------------------------------------------------------
// API route handling
// ---------------------------------------------------------------------------

describe("prod-server: API routes", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");
    fs.mkdirSync(clientDir, { recursive: true });

    // API routes server entry
    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [
  {
    pattern: "/api/hello",
    regex: /^\\/api\\/hello$/,
    paramNames: [],
    type: "api",
    module: {
      GET: async (req) => new Response(JSON.stringify({ msg: "hello" }), {
        headers: { "Content-Type": "application/json" },
      }),
      POST: async (req) => {
        const body = await req.text();
        return new Response(JSON.stringify({ echo: body }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
  {
    pattern: "/api/users/:id",
    regex: /^\\/api\\/users\\/([^/]+)$/,
    paramNames: ["id"],
    type: "api",
    module: {
      GET: async (req, { params }) => new Response(JSON.stringify({ userId: params.id }), {
        headers: { "Content-Type": "application/json" },
      }),
    },
  },
  {
    pattern: "/api/error",
    regex: /^\\/api\\/error$/,
    paramNames: [],
    type: "api",
    module: {
      GET: async () => { throw new Error("boom"); },
    },
  },
];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`
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

  afterAll(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("handles GET API route", async () => {
    const res = await fetch(port, "/api/hello");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ msg: "hello" });
  });

  it("handles POST API route with body", async () => {
    const res = await fetch(port, "/api/hello", {
      method: "POST",
      body: "test-body",
      headers: { "content-type": "text/plain" },
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ echo: "test-body" });
  });

  it("extracts URL params from dynamic API routes", async () => {
    const res = await fetch(port, "/api/users/42");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ userId: "42" });
  });

  it("returns 405 for unsupported method", async () => {
    const res = await fetch(port, "/api/hello", { method: "DELETE" });
    expect(res.status).toBe(405);
    expect(JSON.parse(res.body).error).toContain("DELETE");
  });

  it("returns 500 for route handler errors", async () => {
    const res = await fetch(port, "/api/error");
    expect(res.status).toBe(500);
    expect(JSON.parse(res.body).error).toBe("Internal server error");
  });

  it("includes security headers on API responses", async () => {
    const res = await fetch(port, "/api/hello");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("includes security headers on 405 responses", async () => {
    const res = await fetch(port, "/api/hello", { method: "PATCH" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("includes security headers on 500 responses", async () => {
    const res = await fetch(port, "/api/error");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("enforces 1MB body size limit", async () => {
    const largeBody = "x".repeat(1024 * 1024 + 1);
    const res = await fetch(port, "/api/hello", {
      method: "POST",
      body: largeBody,
      headers: { "content-type": "text/plain" },
    });
    expect(res.status).toBe(413);
    expect(JSON.parse(res.body).error).toContain("too large");
  });
});

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

describe("prod-server: route matching", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");
    fs.mkdirSync(clientDir, { recursive: true });
    // No index.html — so unmatched routes get 404

    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [
  {
    pattern: "/",
    regex: /^\\/$/,
    paramNames: [],
    type: "api",
    module: { GET: async () => new Response("root") },
  },
  {
    pattern: "/about",
    regex: /^\\/about$/,
    paramNames: [],
    type: "api",
    module: { GET: async () => new Response("about") },
  },
  {
    pattern: "/blog/:slug",
    regex: /^\\/blog\\/([^/]+)$/,
    paramNames: ["slug"],
    type: "api",
    module: { GET: async (req, { params }) => new Response(params.slug) },
  },
];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`
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

  afterAll(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("matches root route", async () => {
    const res = await fetch(port, "/");
    expect(res.status).toBe(200);
    expect(res.body).toBe("root");
  });

  it("matches static route", async () => {
    const res = await fetch(port, "/about");
    expect(res.status).toBe(200);
    expect(res.body).toBe("about");
  });

  it("strips trailing slashes", async () => {
    const res = await fetch(port, "/about/");
    expect(res.status).toBe(200);
    expect(res.body).toBe("about");
  });

  it("matches dynamic route and extracts params", async () => {
    const res = await fetch(port, "/blog/my-post");
    expect(res.status).toBe(200);
    expect(res.body).toBe("my-post");
  });

  it("returns 404 for no match and no index.html", async () => {
    const res = await fetch(port, "/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toBe("Not Found");
  });

  it("404 includes security headers", async () => {
    const res = await fetch(port, "/nonexistent");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

// ---------------------------------------------------------------------------
// Image optimization endpoint (501 when sharp not available)
// ---------------------------------------------------------------------------

describe("prod-server: image optimization endpoint", () => {
  let distDir: string;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    distDir = tmpDir();
    const clientDir = path.join(distDir, "client");
    fs.mkdirSync(clientDir, { recursive: true });

    const serverEntryPath = path.join(distDir, "server-entry.mjs");
    fs.writeFileSync(
      serverEntryPath,
      `export const routes = [];
export const layoutModules = {};
export const boundaryModules = {};
export const globalError = null;
`
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

  afterAll(() => {
    server?.close();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("responds to /_fabrk/image endpoint", async () => {
    const res = await fetch(port, "/_fabrk/image?url=/test.png&w=100&q=75");
    // Without sharp installed or valid image, expect 400 or error response
    expect([400, 404, 500]).toContain(res.status);
  });
});
