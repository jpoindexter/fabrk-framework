import { parseArgs } from "./parse-args";
import { loadFabrkViteConfig } from "./load-config";

export async function runDev(root: string, rawArgs: string[], version: string): Promise<void> {
  const args = parseArgs(rawArgs);
  const port = typeof args.port === "string" ? parseInt(args.port, 10) : 5173;
  const host = typeof args.host === "string" ? args.host : args.host === true ? "0.0.0.0" : "localhost";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk dev v${version}\n`);

  try {
    const { scanTools } = await import("../tools/scanner");
    const { loadToolDefinitions } = await import("../tools/loader");
    const scanned = scanTools(root);
    if (scanned.length > 0) {
      const toolDefs = await loadToolDefinitions(scanned);
      const { startMcpDevServer } = await import("../tools/mcp-dev-server");
      await startMcpDevServer(toolDefs);
      // eslint-disable-next-line no-console
      console.log(`  MCP server started with ${scanned.length} tool(s)\n`);
    }
  } catch (err) {
    console.warn("  [fabrk] Tool scanning failed:", err);
  }

  try {
    const { scanAgents } = await import("../agents/scanner");
    const agents = scanAgents(root);
    if (agents.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `  Discovered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}\n`
      );
    }
  } catch (err) {
    console.warn("  [fabrk] Agent scanning failed:", err);
  }

  const { createServer } = await import("vite");
  const { fabrkPlugin, agentPlugin, dashboardPlugin, userConfigPath } =
    await loadFabrkViteConfig(root);

  const server = await createServer({
    configFile: userConfigPath ?? false,
    root,
    plugins: userConfigPath
      ? []
      : [fabrkPlugin(), agentPlugin(), dashboardPlugin()],
    server: { port, host },
    ssr: { external: true },
  });

  await server.listen();
  server.printUrls();
}
