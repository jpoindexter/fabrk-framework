import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { buildSecurityHeaders } from "../middleware/security";
import {
  runMiddleware,
  extractMiddleware,
  type MiddlewareHandler,
} from "./middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProdServerOptions {
  /** Path to dist/ directory. */
  distDir: string;
  /** Port to listen on. Defaults to 3000. */
  port?: number;
  /** Host to bind to. Defaults to "localhost". */
  host?: string;
  /** Path to the built server entry module. */
  serverEntryPath: string;
  /** Optional middleware module path. */
  middlewarePath?: string;
}

interface ServerEntry {
  routes: Array<{
    pattern: string;
    regex: RegExp;
    paramNames: string[];
    type: "page" | "api";
    module: Record<string, unknown>;
  }>;
  layoutModules: Record<string, Record<string, unknown>>;
  boundaryModules: Record<string, Record<string, unknown>>;
  globalError: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// MIME types
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".wasm": "application/wasm",
};

// ---------------------------------------------------------------------------
// Static file serving with path traversal protection
// ---------------------------------------------------------------------------

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Determine cache headers based on filename pattern.
 * Hashed assets (e.g. chunk-abc123.js) get immutable cache.
 * Unhashed assets get must-revalidate.
 */
function getCacheHeaders(filename: string): Record<string, string> {
  const isHashed = /[-.][\da-f]{8,}\./i.test(filename);
  if (isHashed) {
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
    };
  }
  return {
    "Cache-Control": "public, no-cache, must-revalidate",
  };
}

/**
 * Serve a static file from dist/client/.
 * Returns true if file was served, false if not found.
 */
async function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  clientDir: string
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);

  // Normalize double slashes
  pathname = pathname.replace(/\/+/g, "/");

  const filePath = path.join(clientDir, pathname);
  const resolvedPath = path.resolve(filePath);

  // Path traversal protection — resolved path must be under client dir
  const resolvedClientDir = path.resolve(clientDir);
  if (!resolvedPath.startsWith(resolvedClientDir + path.sep) && resolvedPath !== resolvedClientDir) {
    return false;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolvedPath);
  } catch {
    return false;
  }

  if (!stat.isFile()) return false;

  const mimeType = getMimeType(resolvedPath);
  const cacheHeaders = getCacheHeaders(path.basename(resolvedPath));
  const securityHeaders = buildSecurityHeaders();

  // Content negotiation for compression
  const acceptEncoding = (req.headers["accept-encoding"] as string) || "";
  const isCompressible = mimeType.includes("text/") ||
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("svg");

  res.writeHead(200, {
    "Content-Type": mimeType,
    ...cacheHeaders,
    ...securityHeaders,
  });

  if (isCompressible && stat.size > 1024) {
    if (acceptEncoding.includes("br")) {
      res.setHeader("Content-Encoding", "br");
      const readStream = fs.createReadStream(resolvedPath);
      const brotli = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      });
      await pipeline(readStream, brotli, res);
      return true;
    }
    if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
      const readStream = fs.createReadStream(resolvedPath);
      const gzip = zlib.createGzip({ level: 6 });
      await pipeline(readStream, gzip, res);
      return true;
    }
  }

  // Uncompressed
  const readStream = fs.createReadStream(resolvedPath);
  await pipeline(readStream, res);
  return true;
}

// ---------------------------------------------------------------------------
// SSR request handling
// ---------------------------------------------------------------------------

function matchRoute(
  routes: ServerEntry["routes"],
  pathname: string
): {
  route: ServerEntry["routes"][number];
  params: Record<string, string>;
} | null {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");

  for (const route of routes) {
    const match = route.regex.exec(normalized);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const value = match[i + 1];
        if (value !== undefined) params[route.paramNames[i]] = value;
      }
      return { route, params };
    }
  }
  return null;
}

async function handleApiRoute(
  req: http.IncomingMessage,
  route: ServerEntry["routes"][number],
  params: Record<string, string>
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const method = (req.method || "GET").toUpperCase();
  const handler = route.module[method] ?? route.module[method.toLowerCase()];

  if (typeof handler !== "function") {
    return {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
      body: JSON.stringify({ error: `Method ${method} not allowed` }),
    };
  }

  try {
    const url = `http://localhost${req.url || "/"}`;
    const bodyChunks: Buffer[] = [];
    let totalSize = 0;
    const MAX_BODY = 1024 * 1024;

    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY) {
        return {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            ...buildSecurityHeaders(),
          },
          body: JSON.stringify({ error: "Request body too large" }),
        };
      }
      bodyChunks.push(chunk);
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(
          ([, v]) => typeof v === "string"
        ) as [string, string][]
      ),
      body: method !== "GET" && method !== "HEAD"
        ? Buffer.concat(bodyChunks).toString()
        : undefined,
    });

    const response = await handler(webRequest, { params });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: { ...responseHeaders, ...buildSecurityHeaders() },
      body: await response.text(),
    };
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

async function handlePageRoute(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  try {
    const PageComponent = route.module.default;
    if (typeof PageComponent !== "function") {
      return {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          ...buildSecurityHeaders(),
        },
        body: "Page component must export a default function",
      };
    }

    const [reactDomServer, React] = await Promise.all([
      import("react-dom/server"),
      import("react"),
    ]);

    const createElement = React.createElement ?? React.default?.createElement;
    const renderToString =
      reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

    if (typeof createElement !== "function" || typeof renderToString !== "function") {
      return {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
        body: "React SSR modules not available",
      };
    }

    let element: React.ReactNode = createElement(PageComponent as React.FC<Record<string, unknown>>, { params });

    const routeEntry = route as unknown as { layoutPaths?: string[] };
    if (routeEntry.layoutPaths) {
      for (const lp of routeEntry.layoutPaths.slice().reverse()) {
        const layoutMod = serverEntry.layoutModules[lp];
        if (layoutMod && typeof layoutMod.default === "function") {
          element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
        }
      }
    }

    const ssrBody = renderToString(element);

    const metadata = route.module.metadata as
      | { title?: string; description?: string }
      | undefined;

    let head = "";
    if (metadata?.title) {
      head += `<title>${escapeHtml(metadata.title)}</title>\n`;
    }
    if (metadata?.description) {
      head += `<meta name="description" content="${escapeHtml(metadata.description)}" />\n`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head}
</head>
<body>
  <div id="root">${ssrBody}</div>
</body>
</html>`;

    return {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...buildSecurityHeaders(),
      },
      body: html,
    };
  } catch (err) {
    console.error("[fabrk] SSR render error:", err);
    return {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      },
      body: "Internal server error",
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export async function startProdServer(
  options: ProdServerOptions
): Promise<http.Server> {
  const {
    distDir,
    port = 3000,
    host = "localhost",
    serverEntryPath,
    middlewarePath,
  } = options;

  const clientDir = path.join(distDir, "client");

  let serverEntry: ServerEntry;
  try {
    serverEntry = await import(serverEntryPath);
  } catch (err) {
    console.error("[fabrk] Failed to load server entry:", err);
    throw new Error(
      "Failed to load server entry. Run `fabrk build` first."
    );
  }

  // Load middleware if available
  let middlewareHandler: MiddlewareHandler | undefined;
  let middlewareMatchers: RegExp[] | undefined;
  if (middlewarePath) {
    try {
      const middlewareMod = await import(middlewarePath);
      const extracted = extractMiddleware(middlewareMod);
      middlewareHandler = extracted.handler;
      middlewareMatchers = extracted.matchers;
      // eslint-disable-next-line no-console
      console.log(`  [fabrk] Middleware loaded from ${middlewarePath}`);
    } catch (err) {
      console.warn("[fabrk] Failed to load middleware:", err);
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const served = await serveStaticFile(req, res, clientDir);
      if (served) return;

      // Run middleware before routing
      if (middlewareHandler) {
        const webReq = new Request(`http://localhost${req.url || "/"}`, {
          method: req.method,
          headers: Object.fromEntries(
            Object.entries(req.headers).filter(
              ([, v]) => typeof v === "string",
            ) as [string, string][],
          ),
        });

        const mwResult = await runMiddleware(
          webReq,
          middlewareHandler,
          middlewareMatchers,
        );

        if (mwResult.response) {
          const responseHeaders: Record<string, string> = {};
          mwResult.response.headers.forEach((value: string, key: string) => {
            responseHeaders[key] = value;
          });
          res.writeHead(mwResult.response.status, responseHeaders);
          res.end(await mwResult.response.text());
          return;
        }

        // Handle rewrites — change the effective URL
        if (mwResult.rewriteUrl) {
          req.url = mwResult.rewriteUrl;
        }
      }

      const url = new URL(req.url || "/", "http://localhost");
      const matched = matchRoute(serverEntry.routes, url.pathname);

      if (!matched) {
        const indexPath = path.join(clientDir, "index.html");
        if (fs.existsSync(indexPath)) {
          const html = fs.readFileSync(indexPath, "utf-8");
          const securityHeaders = buildSecurityHeaders();
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            ...securityHeaders,
          });
          res.end(html);
          return;
        }

        const securityHeaders = buildSecurityHeaders();
        res.writeHead(404, {
          "Content-Type": "text/plain",
          ...securityHeaders,
        });
        res.end("Not Found");
        return;
      }

      let result: { status: number; headers: Record<string, string>; body: string };

      if (matched.route.type === "api") {
        result = await handleApiRoute(req, matched.route, matched.params);
      } else {
        result = await handlePageRoute(
          matched.route,
          matched.params,
          serverEntry
        );
      }

      res.writeHead(result.status, result.headers);
      res.end(result.body);
    } catch (err) {
      console.error("[fabrk] Unhandled server error:", err);
      const securityHeaders = buildSecurityHeaders();
      res.writeHead(500, {
        "Content-Type": "text/plain",
        ...securityHeaders,
      });
      res.end("Internal server error");
    }
  });

  // Graceful shutdown — track connections for force-close after timeout
  const connections = new Set<import("node:net").Socket>();

  server.on("connection", (socket) => {
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n  [fabrk] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log("  [fabrk] Server closed.");
      process.exit(0);
    });

    // Force-close after 5s
    setTimeout(() => {
      for (const socket of connections) {
        socket.destroy();
      }
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      // eslint-disable-next-line no-console
      console.log(`\n  fabrk production server`);
      // eslint-disable-next-line no-console
      console.log(`  Local:   http://${host}:${port}/\n`);
      resolve(server);
    });

    server.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.error(`  [fabrk] Port ${port} is already in use.`);
      }
      reject(err);
    });
  });
}
