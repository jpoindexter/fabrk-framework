import type { Plugin, ViteDevServer, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { loadFabrkConfig, type FabrkConfig } from "../config/fabrk-config";
import { applySecurityHeaders } from "../middleware/security";
import { nodeToWebRequest, writeWebResponse } from "../runtime/node-web-bridge";
import { handleTTSRequest, handleSTTRequest } from "./voice-handler";
import { handleRealtimeUpgrade } from "./voice-ws-handler";

export function voicePlugin(): Plugin {
  let root: string;

  return {
    name: "fabrk:voice",
    enforce: "pre",

    config(config) {
      root = config.root ?? process.cwd();
    },

    configureServer(server: ViteDevServer) {
      let fabrkConfig: FabrkConfig = {};
      const configReady = loadFabrkConfig(root).then((c) => { fabrkConfig = c; });

      // WebSocket upgrade for realtime
      server.httpServer?.on("upgrade", async (req, socket, head) => {
        const url = req.url ?? "";
        if (!url.startsWith("/__ai/realtime")) return;

        await configReady;

        if (!fabrkConfig.voice?.enabled || !fabrkConfig.voice?.realtime?.enabled) {
          socket.destroy(new Error("Realtime voice not enabled"));
          return;
        }

        handleRealtimeUpgrade(req, socket, head, {
          voice: fabrkConfig.voice,
          isDev: true,
        });
      });

      return () => {
        server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (pathname !== "/__ai/tts" && pathname !== "/__ai/stt") return next();

          await configReady;

          if (!fabrkConfig.voice?.enabled) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Voice not enabled" }));
            return;
          }

          try {
            const webReq = await nodeToWebRequest(req, url);
            let webRes: Response;

            if (pathname === "/__ai/tts") {
              webRes = await handleTTSRequest(webReq, { voice: fabrkConfig.voice });
            } else {
              webRes = await handleSTTRequest(webReq, { voice: fabrkConfig.voice });
            }

            await writeWebResponse(res, webRes);
          } catch (err) {
            console.error(`[fabrk] Voice ${pathname} error:`, err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      };
    },
  };
}
