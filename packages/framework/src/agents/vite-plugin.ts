import type { Plugin, ViteDevServer } from "vite";
import { scanAgents } from "./scanner.js";
import { createAgentHandler } from "./route-handler.js";
import type { AgentDefinition } from "./define-agent.js";

/**
 * Vite plugin that scans agents/ directory and registers
 * /api/agents/* middleware in the dev server.
 */
export function agentPlugin(): Plugin {
  let root: string;

  return {
    name: "fabrk:agents",
    enforce: "pre",

    config(config) {
      root = config.root ?? process.cwd();
    },

    configureServer(server: ViteDevServer) {
      const agents = scanAgents(root);

      if (agents.length > 0) {
        console.log(
          `[fabrk] Discovered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}`
        );
      }

      // Return a function to register middleware AFTER Vite's built-in middleware
      return () => {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          const url: string = req.url ?? "/";
          const pathname = url.split("?")[0];

          // Only handle /api/agents/* routes
          if (!pathname.startsWith("/api/agents/")) return next();

          const agentName = pathname.replace("/api/agents/", "").split("/")[0];
          const agent = agents.find((a) => a.name === agentName);

          if (!agent) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: `Agent "${agentName}" not found` }));
            return;
          }

          try {
            // Dynamically import the agent definition via Vite's SSR module loader
            const mod = await server.ssrLoadModule(agent.filePath);
            const agentDef: AgentDefinition = mod.default ?? mod;

            const handler = createAgentHandler({
              model: agentDef.model,
              tools: agentDef.tools ?? [],
              stream: agentDef.stream ?? true,
              auth: agentDef.auth ?? "none",
              systemPrompt: agentDef.systemPrompt,
              budget: agentDef.budget,
              fallback: agentDef.fallback,
            });

            // Convert Node.js IncomingMessage to Web Request
            const protocol = req.headers["x-forwarded-proto"] ?? "http";
            const host = req.headers.host ?? "localhost";
            const webUrl = `${protocol}://${host}${url}`;

            const bodyChunks: Buffer[] = [];
            for await (const chunk of req) {
              bodyChunks.push(chunk);
            }
            const body = Buffer.concat(bodyChunks).toString();

            const webReq = new Request(webUrl, {
              method: req.method,
              headers: Object.fromEntries(
                Object.entries(req.headers).filter(
                  ([, v]) => typeof v === "string"
                ) as [string, string][]
              ),
              body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
            });

            const webRes = await handler(webReq);

            // Write Web Response back to Node.js response
            res.statusCode = webRes.status;
            webRes.headers.forEach((value: string, key: string) => {
              res.setHeader(key, value);
            });

            if (webRes.body) {
              const reader = webRes.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            }
            res.end();
          } catch (err) {
            console.error(`[fabrk] Agent "${agentName}" error:`, err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Agent error", message: String(err) })
            );
          }
        });
      };
    },
  };
}
