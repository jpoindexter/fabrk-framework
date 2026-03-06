import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  extractMiddleware,
  type MiddlewareHandler,
} from "./middleware";
import { handleRealtimeUpgrade } from "../agents/voice-ws-handler";
import type { VoiceConfig } from "@fabrk/ai";
import { readManifest, getEntryAssets } from "./asset-manifest";
import type { Manifest } from "./asset-manifest";
import { type ServerEntry } from "./route-handlers";
import { type ISRCacheHandler } from "./isr-cache";

export interface LoadResult {
  serverEntry: ServerEntry;
  middlewareHandler?: MiddlewareHandler;
  middlewareMatchers?: RegExp[];
  cssTags: string;
  scriptTags: string;
}

export async function loadServerModules(
  clientDir: string,
  serverEntryPath: string,
  middlewarePath?: string,
): Promise<LoadResult> {
  let cssTags = "";
  let scriptTags = "";

  const _manifest: Manifest | null = readManifest(clientDir);
  if (_manifest) {
    const { scripts, styles } = getEntryAssets(_manifest);
    cssTags = styles
      .map((href) => `  <link rel="stylesheet" href="${href}" />`)
      .join("\n");
    scriptTags = scripts
      .map((src) => `  <script type="module" src="${src}"></script>`)
      .join("\n");
  }

  let serverEntry: ServerEntry;
  try {
    serverEntry = await import(serverEntryPath);
  } catch (err) {
    console.error("[fabrk] Failed to load server entry:", err);
    throw new Error("Failed to load server entry. Run `fabrk build` first.");
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

  return { serverEntry, middlewareHandler, middlewareMatchers, cssTags, scriptTags };
}

export function seedISRCache(distDir: string, isrCache: ISRCacheHandler) {
  const isrPreDir = path.join(distDir, "server", "isr-prerender");
  if (!fs.existsSync(isrPreDir)) return;

  const files = fs.readdirSync(isrPreDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(isrPreDir, file), "utf-8"),
      ) as {
        pathname: string; html: string; revalidate: number; tags: string[];
      };
      void isrCache.set(data.pathname, {
        html: data.html,
        timestamp: 0,
        revalidate: data.revalidate,
        tags: data.tags,
      });
    } catch (err) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[fabrk] failed to parse ISR prerender file:', file, err);
      }
    }
  }
}

export function attachWebSocket(
  server: http.Server,
  voiceConfig?: VoiceConfig,
) {
  if (!voiceConfig?.enabled || !voiceConfig?.realtime?.enabled) return;
  server.on("upgrade", (req, socket, head) => {
    if (!(req.url ?? "").startsWith("/__ai/realtime")) return;
    handleRealtimeUpgrade(req, socket, head, {
      voice: voiceConfig,
      isDev: false,
    });
  });
}

export function attachGracefulShutdown(server: http.Server) {
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
      for (const socket of connections) socket.destroy();
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
