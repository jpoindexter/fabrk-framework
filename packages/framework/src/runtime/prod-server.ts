import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { buildSecurityHeaders } from "../middleware/security";

function nodeHeadersToRecord(headers: http.IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([, v]) => typeof v === "string") as [string, string][]
  );
}

async function drainStream(reader: ReadableStreamDefaultReader<Uint8Array>, res: http.ServerResponse): Promise<void> {
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
  }
}
import {
  runMiddleware,
  extractMiddleware,
  type MiddlewareHandler,
} from "./middleware";
import {
  resolveMetadata,
  mergeMetadata,
  buildMetadataHtml,
} from "./metadata";
import { isImageRequest, handleImageRequest } from "./image-handler";
import { isOGRequest, handleOGRequest, type OGTemplate } from "./og-handler";
import {
  InMemoryISRCache,
  serveFromISR,
  getRevalidateInterval,
  getPageTags,
  type ISRCacheHandler,
} from "./isr-cache";
import { handleTTSRequest, handleSTTRequest } from "../agents/voice-handler";
import { handleRealtimeUpgrade } from "../agents/voice-ws-handler";
import type { VoiceConfig } from "@fabrk/ai";
import { createApprovalHandler } from "../agents/approval-handler";
import { readManifest, getEntryAssets } from "./asset-manifest";
import type { Manifest } from "./asset-manifest";
import { runWithContext } from "./server-context";

const approvalHandler = createApprovalHandler();

// Populated by startProdServer once manifest is loaded
let _cssTags = "";
let _scriptTags = "";

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
  /** Optional ISR cache handler. Defaults to InMemoryISRCache. */
  isrCache?: ISRCacheHandler;
  /** OG image templates keyed by name. */
  ogTemplates?: Map<string, OGTemplate>;
  /** Voice configuration for TTS/STT/Realtime routes. */
  voice?: VoiceConfig;
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

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

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

async function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  clientDir: string
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }

  pathname = pathname.replace(/\/+/g, "/");

  const filePath = path.join(clientDir, pathname);
  const resolvedPath = path.resolve(filePath);

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

  const acceptEncoding = (req.headers["accept-encoding"] as string) || "";
  const isCompressible = mimeType.includes("text/") ||
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("svg");

  let encoding: "br" | "gzip" | null = null;
  if (isCompressible && stat.size > 1024) {
    if (acceptEncoding.includes("br")) encoding = "br";
    else if (acceptEncoding.includes("gzip")) encoding = "gzip";
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    ...cacheHeaders,
    ...securityHeaders,
  };
  if (encoding) headers["Content-Encoding"] = encoding;

  res.writeHead(200, headers);

  if (encoding === "br") {
    const readStream = fs.createReadStream(resolvedPath);
    const brotli = zlib.createBrotliCompress({
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
    });
    await pipeline(readStream, brotli, res);
    return true;
  }
  if (encoding === "gzip") {
    const readStream = fs.createReadStream(resolvedPath);
    const gzip = zlib.createGzip({ level: 6 });
    await pipeline(readStream, gzip, res);
    return true;
  }

  const readStream = fs.createReadStream(resolvedPath);
  await pipeline(readStream, res);
  return true;
}

function matchRoute(
  routes: ServerEntry["routes"],
  pathname: string,
  _softNavigation = false,
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
      headers: nodeHeadersToRecord(req.headers),
      body: method !== "GET" && method !== "HEAD"
        ? Buffer.concat(bodyChunks)
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

async function renderPageToString(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
): Promise<{ status: number; body: string }> {
  const [reactDomServer, React] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);

  const createElement = React.createElement ?? React.default?.createElement;
  const renderToString =
    reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

  if (typeof createElement !== "function" || typeof renderToString !== "function") {
    return { status: 500, body: "React SSR modules not available" };
  }

  const url = new URL(reqUrl, "http://localhost");
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const metadataContext = { params, searchParams };

  const metadataLayers = [];
  const routeEntry = route as unknown as { layoutPaths?: string[] };
  if (routeEntry.layoutPaths) {
    for (const lp of routeEntry.layoutPaths) {
      const layoutMod = serverEntry.layoutModules[lp];
      if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
    }
  }
  metadataLayers.push(await resolveMetadata(route.module, metadataContext));
  const metadata = mergeMetadata(metadataLayers);
  const head = buildMetadataHtml(metadata);

  let element: React.ReactNode = createElement(
    route.module.default as React.FC<Record<string, unknown>>,
    { params, searchParams }
  );

  if (routeEntry.layoutPaths) {
    for (const lp of routeEntry.layoutPaths.slice().reverse()) {
      const layoutMod = serverEntry.layoutModules[lp];
      if (layoutMod && typeof layoutMod.default === "function") {
        element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
      }
    }
  }

  const ssrBody = renderToString(element);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${_cssTags}
</head>
<body>
  <div id="root">${ssrBody}</div>
${_scriptTags}
</body>
</html>`;

  return { status: 200, body: html };
}

async function handlePageRoute(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
  isrCache?: ISRCacheHandler,
): Promise<{ status: number; headers: Record<string, string>; body: string | ReadableStream }> {
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

    let routeHeaders: Record<string, string> = {};
    if (typeof route.module.headers === "function") {
      try {
        const url = new URL(reqUrl, "http://localhost");
        const ctx = { params, searchParams: Object.fromEntries(url.searchParams.entries()) };
        const h = await (route.module.headers as (ctx: { params: Record<string, string>; searchParams: Record<string, string> }) => Promise<Record<string, string>> | Record<string, string>)(ctx);
        if (h && typeof h === "object") routeHeaders = h;
      } catch { /* skip invalid headers export */ }
    }

    const revalidateInterval = getRevalidateInterval(route.module);
    if (isrCache && revalidateInterval !== null) {
      const url = new URL(reqUrl, "http://localhost");
      const tags = getPageTags(route.module);
      const isrResult = await serveFromISR(
        isrCache,
        url.pathname,
        revalidateInterval,
        async () => {
          const result = await renderPageToString(route, params, serverEntry, reqUrl);
          return result.body;
        },
        tags,
      );
      return {
        status: 200,
        headers: {
          ...routeHeaders,
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
          ...(isrResult.revalidating ? { "X-Fabrk-ISR": "stale" } : { "X-Fabrk-ISR": isrResult.cached ? "hit" : "miss" }),
        },
        body: isrResult.html,
      };
    }

    const [reactDomServer, React] = await Promise.all([
      import("react-dom/server"),
      import("react"),
    ]);

    const createElement = React.createElement ?? React.default?.createElement;
    const renderToString =
      reactDomServer.renderToString ?? reactDomServer.default?.renderToString;
    const renderToReadableStream =
      reactDomServer.renderToReadableStream ?? reactDomServer.default?.renderToReadableStream;

    if (typeof createElement !== "function") {
      return {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
        body: "React SSR modules not available",
      };
    }

    const url = new URL(reqUrl, "http://localhost");
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const metadataContext = { params, searchParams };

    const metadataLayers = [];
    const routeEntry = route as unknown as { layoutPaths?: string[] };
    if (routeEntry.layoutPaths) {
      for (const lp of routeEntry.layoutPaths) {
        const layoutMod = serverEntry.layoutModules[lp];
        if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
      }
    }
    metadataLayers.push(await resolveMetadata(route.module, metadataContext));
    const metadata = mergeMetadata(metadataLayers);
    const head = buildMetadataHtml(metadata);

    let element: React.ReactNode = createElement(
      PageComponent as React.FC<Record<string, unknown>>,
      { params, searchParams }
    );

    if (routeEntry.layoutPaths) {
      for (const lp of routeEntry.layoutPaths.slice().reverse()) {
        const layoutMod = serverEntry.layoutModules[lp];
        if (layoutMod && typeof layoutMod.default === "function") {
          element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
        }
      }
    }

    if (typeof renderToReadableStream === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderOpts: any = {};
      const routeAny = route as Record<string, unknown>;
      if (routeAny.ppr === true) {
        renderOpts.onPostpone = () => { /* PPR: allow deferred streaming */ };
      }
      const reactStream = await renderToReadableStream(element, renderOpts);

      const prefix = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${_cssTags}
</head>
<body>
  <div id="root">`;
      const suffix = `</div>
${_scriptTags}
</body>
</html>`;

      const encoder = new TextEncoder();
      const reader = reactStream.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(prefix));
        },
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode(suffix));
              controller.close();
              return;
            }
            controller.enqueue(value);
          } catch {
            controller.close();
          }
        },
      });

      return {
        status: 200,
        headers: {
          ...routeHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Transfer-Encoding": "chunked",
          ...buildSecurityHeaders(),
        },
        body: stream,
      };
    }

    if (typeof renderToString !== "function") {
      return {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
        body: "React SSR modules not available",
      };
    }

    const ssrBody = renderToString(element);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${_cssTags}
</head>
<body>
  <div id="root">${ssrBody}</div>
${_scriptTags}
</body>
</html>`;

    return {
      status: 200,
      headers: {
        ...routeHeaders,
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

async function handleEdgeRoute(
  req: http.IncomingMessage,
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
): Promise<Response> {
  const method = (req.method || "GET").toUpperCase();
  const handler = route.module[method] ?? route.module[method.toLowerCase()] ?? route.module.default;

  if (typeof handler !== "function") {
    return new Response(JSON.stringify({ error: "Edge handler not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  const bodyChunks: Buffer[] = [];
  let totalSize = 0;
  const MAX_BODY = 1024 * 1024;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
      });
    }
    bodyChunks.push(chunk);
  }

  const webRequest = new Request(`http://localhost${req.url || "/"}`, {
    method: req.method,
    headers: nodeHeadersToRecord(req.headers),
    body: method !== "GET" && method !== "HEAD"
      ? Buffer.concat(bodyChunks).toString()
      : undefined,
  });

  try {
    return await handler(webRequest, { params });
  } catch (err) {
    console.error("[fabrk] Edge route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }
}

export async function startProdServer(
  options: ProdServerOptions
): Promise<http.Server> {
  const {
    distDir,
    port = 3000,
    host = "localhost",
    serverEntryPath,
    middlewarePath,
    isrCache = new InMemoryISRCache(),
    ogTemplates,
    voice: voiceConfig,
  } = options;

  const clientDir = path.join(distDir, "client");

  // Load Vite manifest to inject asset tags into SSR HTML
  const _manifest: Manifest | null = readManifest(clientDir);
  if (_manifest) {
    const { scripts, styles } = getEntryAssets(_manifest);
    _cssTags = styles.map((href) => `  <link rel="stylesheet" href="${href}" />`).join("\n");
    _scriptTags = scripts.map((src) => `  <script type="module" src="${src}"></script>`).join("\n");
  }

  let serverEntry: ServerEntry;
  try {
    serverEntry = await import(serverEntryPath);
  } catch (err) {
    console.error("[fabrk] Failed to load server entry:", err);
    throw new Error(
      "Failed to load server entry. Run `fabrk build` first."
    );
  }

  // Pre-populate ISR cache from build-time pre-rendered pages
  const isrPreDir = path.join(distDir, "server", "isr-prerender");
  if (fs.existsSync(isrPreDir)) {
    const files = fs.readdirSync(isrPreDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(isrPreDir, file), "utf-8")) as {
          pathname: string;
          html: string;
          revalidate: number;
          tags: string[];
        };
        await isrCache.set(data.pathname, {
          html: data.html,
          timestamp: 0, // immediately stale — first request triggers background revalidation
          revalidate: data.revalidate,
          tags: data.tags,
        });
      } catch {
        // ignore corrupt files
      }
    }
  }

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

      const parsedUrl = new URL(req.url || "/", "http://localhost");
      if (isImageRequest(parsedUrl.pathname)) {
        const imgReq = new Request(`http://localhost${req.url || "/"}`, {
          method: "GET",
          headers: nodeHeadersToRecord(req.headers),
        });
        const imgRes = await handleImageRequest(imgReq, clientDir);
        const imgHeaders: Record<string, string> = {};
        imgRes.headers.forEach((value: string, key: string) => {
          imgHeaders[key] = value;
        });
        res.writeHead(imgRes.status, imgHeaders);
        if (imgRes.body) {
          await drainStream(imgRes.body.getReader(), res);
        }
        res.end();
        return;
      }

      if (isOGRequest(parsedUrl.pathname) && ogTemplates) {
        const ogReq = new Request(`http://localhost${req.url || "/"}`, {
          method: "GET",
          headers: nodeHeadersToRecord(req.headers),
        });
        const ogRes = await handleOGRequest(ogReq, ogTemplates);
        const ogHeaders: Record<string, string> = {};
        ogRes.headers.forEach((value: string, key: string) => {
          ogHeaders[key] = value;
        });
        res.writeHead(ogRes.status, ogHeaders);
        if (ogRes.body) {
          await drainStream(ogRes.body.getReader(), res);
        }
        res.end();
        return;
      }

      // Agent approval endpoint: POST /__ai/agents/:name/approve
      const approvalUrl = new URL(req.url || "/", "http://localhost");
      if (
        approvalUrl.pathname.startsWith("/__ai/agents/") &&
        approvalUrl.pathname.endsWith("/approve") &&
        req.method === "POST"
      ) {
        const agentName = decodeURIComponent(
          approvalUrl.pathname.slice("/__ai/agents/".length, -"/approve".length)
        );
        const bodyChunks: Buffer[] = [];
        let bodySize = 0;
        const APPROVE_MAX_BODY = 64 * 1024;
        for await (const chunk of req) {
          bodySize += chunk.length;
          if (bodySize > APPROVE_MAX_BODY) {
            const secHeaders = buildSecurityHeaders();
            res.writeHead(413, { "Content-Type": "application/json", ...secHeaders });
            res.end(JSON.stringify({ error: "Request body too large" }));
            return;
          }
          bodyChunks.push(chunk);
        }
        const approveBody = Buffer.concat(bodyChunks);
        const approveWebReq = new Request(`http://localhost${req.url || "/"}`, {
          method: "POST",
          headers: nodeHeadersToRecord(req.headers),
          body: approveBody,
        });
        const approveRes = await approvalHandler(approveWebReq, agentName);
        const approveHeaders: Record<string, string> = {};
        approveRes.headers.forEach((v: string, k: string) => { approveHeaders[k] = v; });
        res.writeHead(approveRes.status, approveHeaders);
        res.end(await approveRes.text());
        return;
      }

      // Voice routes
      const voiceUrl = new URL(req.url || "/", "http://localhost");
      if (voiceConfig?.enabled && (voiceUrl.pathname === "/__ai/tts" || voiceUrl.pathname === "/__ai/stt")) {
        const bodyChunks: Buffer[] = [];
        let bodySize = 0;
        const VOICE_MAX_BODY = 26 * 1024 * 1024; // 26 MB for STT files + overhead
        for await (const chunk of req) {
          bodySize += chunk.length;
          if (bodySize > VOICE_MAX_BODY) {
            const secHeaders = buildSecurityHeaders();
            res.writeHead(413, { "Content-Type": "application/json", ...secHeaders });
            res.end(JSON.stringify({ error: "Request body too large" }));
            return;
          }
          bodyChunks.push(chunk);
        }
        const voiceBody = Buffer.concat(bodyChunks);
        const voiceWebReq = new Request(`http://localhost${req.url || "/"}`, {
          method: req.method,
          headers: nodeHeadersToRecord(req.headers),
          body: req.method !== "GET" && req.method !== "HEAD" ? voiceBody : undefined,
        });

        const voiceRes = voiceUrl.pathname === "/__ai/tts"
          ? await handleTTSRequest(voiceWebReq, { voice: voiceConfig })
          : await handleSTTRequest(voiceWebReq, { voice: voiceConfig });

        const voiceHeaders: Record<string, string> = {};
        voiceRes.headers.forEach((v: string, k: string) => { voiceHeaders[k] = v; });
        res.writeHead(voiceRes.status, voiceHeaders);
        if (voiceRes.body) {
          await drainStream(voiceRes.body.getReader(), res);
        }
        res.end();
        return;
      }

      const mwHeaders: Record<string, string> = {};
      if (middlewareHandler) {
        const webReq = new Request(`http://localhost${req.url || "/"}`, {
          method: req.method,
          headers: nodeHeadersToRecord(req.headers),
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

        if (mwResult.rewriteUrl) {
          req.url = mwResult.rewriteUrl;
        }

        if (mwResult.responseHeaders) {
          mwResult.responseHeaders.forEach((value: string, key: string) => {
            mwHeaders[key] = value;
          });
        }
      }

      const url = new URL(req.url || "/", "http://localhost");
      const isSoftNav = req.headers["x-fabrk-navigation"] === "soft";
      const matched = matchRoute(serverEntry.routes, url.pathname, isSoftNav);

      if (!matched) {
        const indexPath = path.join(clientDir, "index.html");
        if (fs.existsSync(indexPath)) {
          const html = fs.readFileSync(indexPath, "utf-8");
          const securityHeaders = buildSecurityHeaders();
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            ...mwHeaders,
            ...securityHeaders,
          });
          res.end(html);
          return;
        }

        const securityHeaders = buildSecurityHeaders();
        res.writeHead(404, {
          "Content-Type": "text/plain",
          ...mwHeaders,
          ...securityHeaders,
        });
        res.end("Not Found");
        return;
      }

      // Edge runtime routes — use fetch-style handler
      const routeAny = matched.route as Record<string, unknown>;
      if (routeAny.runtime === "edge" && typeof routeAny.module === "object" && routeAny.module !== null) {
        const edgeResult = await handleEdgeRoute(req, matched.route, matched.params);
        const edgeHeaders: Record<string, string> = {};
        edgeResult.headers.forEach((value: string, key: string) => {
          edgeHeaders[key] = value;
        });
        res.writeHead(edgeResult.status, { ...edgeHeaders, ...buildSecurityHeaders() });
        if (edgeResult.body) {
          await drainStream(edgeResult.body.getReader(), res);
          res.end();
        } else {
          res.end();
        }
        return;
      }

      if (matched.route.type === "api") {
        const result = await handleApiRoute(req, matched.route, matched.params);
        res.writeHead(result.status, { ...mwHeaders, ...result.headers });
        res.end(result.body);
      } else {
        const webReqForCtx = new Request(`http://localhost${req.url || "/"}`, {
          headers: nodeHeadersToRecord(req.headers),
        });
        const result = await runWithContext(webReqForCtx, () =>
          handlePageRoute(
            matched.route,
            matched.params,
            serverEntry,
            req.url || "/",
            isrCache,
          )
        );
        res.writeHead(result.status, { ...mwHeaders, ...result.headers });

        if (result.body instanceof ReadableStream) {
          await drainStream(result.body.getReader(), res);
          res.end();
        } else {
          res.end(result.body);
        }
      }
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

  // Realtime WebSocket upgrade
  if (voiceConfig?.enabled && voiceConfig?.realtime?.enabled) {
    server.on("upgrade", (req, socket, head) => {
      const upgradeUrl = req.url ?? "";
      if (!upgradeUrl.startsWith("/__ai/realtime")) return;

      handleRealtimeUpgrade(req, socket, head, {
        voice: voiceConfig,
        isDev: false,
      });
    });
  }

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
