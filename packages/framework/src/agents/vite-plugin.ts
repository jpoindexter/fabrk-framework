import type { Plugin, ViteDevServer } from "vite";
import { scanAgents } from "./scanner";
import { createAgentHandler } from "./route-handler";
import type { AgentDefinition } from "./define-agent";
import { scanTools } from "../tools/scanner";
import { setAgents, setTools, recordCall } from "../dashboard/vite-plugin";
import { buildSecurityHeaders } from "../middleware/security";

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
      const tools = scanTools(root);

      setAgents(agents.length);
      setTools(tools.length);

      if (agents.length > 0) {
        console.log(
          `[fabrk] Discovered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}`
        );
      }
      if (tools.length > 0) {
        console.log(
          `[fabrk] Discovered ${tools.length} tool(s): ${tools.map((t) => t.name).join(", ")}`
        );
      }

      return () => {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (!pathname.startsWith("/api/agents/")) return next();

          const agentName = pathname.replace("/api/agents/", "").split("/")[0];
          const agent = agents.find((a) => a.name === agentName);

          if (!agent) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            for (const [k, v] of Object.entries(buildSecurityHeaders())) {
              res.setHeader(k, v);
            }
            res.end(JSON.stringify({ error: "Agent not found" }));
            return;
          }

          try {
            const mod = await server.ssrLoadModule(agent.filePath);
            const agentDef = mod.default ?? mod;

            if (
              !agentDef ||
              typeof agentDef !== "object" ||
              typeof agentDef.model !== "string"
            ) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              for (const [k, v] of Object.entries(buildSecurityHeaders())) {
                res.setHeader(k, v);
              }
              res.end(JSON.stringify({ error: "Invalid agent definition" }));
              return;
            }

            const handler = createAgentHandler({
              model: agentDef.model,
              auth: agentDef.auth ?? "none",
              systemPrompt: agentDef.systemPrompt,
              budget: agentDef.budget,
              fallback: agentDef.fallback,
              onCallComplete: (record) => {
                recordCall({
                  timestamp: Date.now(),
                  agent: record.agent,
                  model: record.model,
                  tokens: record.tokens,
                  cost: record.cost,
                });
              },
            });

            const webReq = await nodeToWebRequest(req, url);
            const webRes = await handler(webReq);
            await writeWebResponse(res, webRes);
          } catch (err) {
            console.error(`[fabrk] Agent "${agentName}" error:`, err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            for (const [k, v] of Object.entries(buildSecurityHeaders())) {
              res.setHeader(k, v);
            }
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      };
    },
  };
}

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

async function nodeToWebRequest(req: any, url: string): Promise<Request> {
  const webUrl = `http://localhost${url}`;

  const bodyChunks: Buffer[] = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_BYTES) {
      req.destroy();
      throw new Error("Request body too large");
    }
    bodyChunks.push(chunk);
  }
  const body = Buffer.concat(bodyChunks).toString();

  return new Request(webUrl, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(
        ([, v]) => typeof v === "string"
      ) as [string, string][]
    ),
    body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
  });
}

async function writeWebResponse(res: any, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
