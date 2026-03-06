import http from "node:http";
import path from "node:path";
import { buildSecurityHeaders } from "../middleware/security";
import { serveStaticFile } from "./static-server";
import { type OGTemplate } from "./og-handler";
import {
  InMemoryISRCache,
  type ISRCacheHandler,
} from "./isr-cache";
import type { VoiceConfig } from "@fabrk/ai";
import { createApprovalHandler } from "../agents/approval-handler";
import {
  handleImageReq,
  handleOGReq,
  handleAIDashboardGuard,
} from "./prod-request-handlers";
import { handleApprovalReq, handleVoiceReq } from "./prod-ai-handlers";
import { runMiddlewareStep, dispatchRoute } from "./prod-route-dispatch";
import {
  loadServerModules,
  seedISRCache,
  attachWebSocket,
  attachGracefulShutdown,
} from "./prod-lifecycle";

const approvalHandler = createApprovalHandler();

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
  options: ProdServerOptions,
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
  const loaded = await loadServerModules(
    clientDir, serverEntryPath, middlewarePath,
  );
  seedISRCache(distDir, isrCache);

  const server = http.createServer(async (req, res) => {
    try {
      if (await serveStaticFile(req, res, clientDir)) return;
      if (await handleImageReq(req, res, clientDir)) return;
      if (await handleOGReq(req, res, ogTemplates)) return;
      if (handleAIDashboardGuard(req, res)) return;
      if (await handleApprovalReq(req, res, approvalHandler)) return;
      if (await handleVoiceReq(req, res, voiceConfig)) return;

      const mwHeaders = await runMiddlewareStep(
        req, res, loaded.middlewareHandler, loaded.middlewareMatchers,
      );
      if (mwHeaders === null) return;

      await dispatchRoute(
        req, res, loaded.serverEntry, clientDir, mwHeaders,
        isrCache, loaded.cssTags, loaded.scriptTags,
      );
    } catch (err) {
      console.error("[fabrk] Unhandled server error:", err);
      res.writeHead(500, {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      });
      res.end("Internal server error");
    }
  });

  attachWebSocket(server, voiceConfig);
  attachGracefulShutdown(server);

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
