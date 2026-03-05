import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { buildSecurityHeaders } from "../middleware/security";
import { serveStaticFile } from "./static-server";
import {
  runMiddleware,
  extractMiddleware,
  type MiddlewareHandler,
} from "./middleware";
import { isImageRequest, handleImageRequest } from "./image-handler";
import { isOGRequest, handleOGRequest, type OGTemplate } from "./og-handler";
import {
  InMemoryISRCache,
  type ISRCacheHandler,
} from "./isr-cache";
import { handleTTSRequest, handleSTTRequest } from "../agents/voice-handler";
import { handleRealtimeUpgrade } from "../agents/voice-ws-handler";
import type { VoiceConfig } from "@fabrk/ai";
import { createApprovalHandler } from "../agents/approval-handler";
import { readManifest, getEntryAssets } from "./asset-manifest";
import type { Manifest } from "./asset-manifest";
import { runWithContext } from "./server-context";
import {
  nodeHeadersToRecord,
  matchRoute,
  handleApiRoute,
  handleEdgeRoute,
  type ServerEntry,
} from "./route-handlers";
import { handlePageRoute } from "./page-renderer";

const approvalHandler = createApprovalHandler();

let _cssTags = "";
let _scriptTags = "";

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
          timestamp: 0,
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
            _cssTags,
            _scriptTags,
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
