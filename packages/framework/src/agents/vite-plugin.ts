import type { Plugin, ViteDevServer, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { scanAgents } from "./scanner";
import { createAgentHandler } from "./route-handler";
import { scanTools } from "../tools/scanner";
import { loadToolDefinitions } from "../tools/loader";
import { loadFabrkConfig, type FabrkConfig } from "../config/fabrk-config";
import { loadPrompt } from "../prompts/loader";
import { setAgents, setTools, recordCall } from "../dashboard/vite-plugin";
import { applySecurityHeaders } from "../middleware/security";
import { nodeToWebRequest, writeWebResponse } from "../runtime/node-web-bridge";
import type { ToolDefinition } from "../tools/define-tool";

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
      const scannedTools = scanTools(root);

      setAgents(agents.length);
      setTools(scannedTools.length);

      let fabrkConfig: FabrkConfig = {};
      let loadedTools: ToolDefinition[] = [];

      const init = (async () => {
        fabrkConfig = await loadFabrkConfig(root);
        if (scannedTools.length > 0) {
          loadedTools = await loadToolDefinitions(scannedTools);
        }
      })();

      if (agents.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[fabrk] Discovered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}`
        );
      }
      if (scannedTools.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[fabrk] Discovered ${scannedTools.length} tool(s): ${scannedTools.map((t) => t.name).join(", ")}`
        );
      }

      return () => {
        server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (!pathname.startsWith("/api/agents/")) return next();

          await init;

          const agentName = pathname.replace("/api/agents/", "").split("/")[0];
          const agent = agents.find((a) => a.name === agentName);

          if (!agent) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
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
              applySecurityHeaders(res);
              res.end(JSON.stringify({ error: "Invalid agent definition" }));
              return;
            }

            // Resolve system prompt — load from file if it's a path
            let systemPrompt = agentDef.systemPrompt;
            if (
              typeof systemPrompt === "string" &&
              (systemPrompt.startsWith("./") || systemPrompt.startsWith("prompts/"))
            ) {
              const promptPath = systemPrompt.startsWith("./")
                ? systemPrompt.slice(2)
                : systemPrompt.slice("prompts/".length);
              systemPrompt = await loadPrompt(root, promptPath);
            }

            // Resolve tool definitions — match agent's tool names to loaded tools
            const agentToolNames: string[] = agentDef.tools ?? [];
            const toolDefs = agentToolNames.length > 0
              ? loadedTools.filter((t) => agentToolNames.includes(t.name))
              : [];

            // Apply config defaults
            const defaultModel = fabrkConfig.ai?.defaultModel;
            const model = agentDef.model || defaultModel || "gpt-4o";
            const stream = agentDef.stream ?? fabrkConfig.agents?.defaultStream ?? true;
            const budget = agentDef.budget ?? fabrkConfig.ai?.budget;

            const handler = createAgentHandler({
              model,
              auth: agentDef.auth ?? "none",
              tools: agentToolNames,
              stream,
              systemPrompt,
              budget,
              fallback: agentDef.fallback ?? fabrkConfig.ai?.fallback,
              toolDefinitions: toolDefs,
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
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      };
    },
  };
}
