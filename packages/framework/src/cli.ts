#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import { runBuild } from "./cli/build-command";
import { runCheck } from "./cli/check-command";

const VERSION = "0.2.0";
const command = process.argv[2];
const rawArgs = process.argv.slice(3);

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else if (arg.startsWith("-")) {
      parsed[arg.slice(1)] = true;
    }
  }
  return parsed;
}

async function loadFabrkViteConfig(root: string) {
  const { fabrkPlugin } = await import("./runtime/plugin");
  const { agentPlugin } = await import("./agents/vite-plugin");
  const { dashboardPlugin } = await import("./dashboard/vite-plugin");

  const configFiles = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  let userConfigPath: string | undefined;
  for (const file of configFiles) {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) {
      userConfigPath = fullPath;
      break;
    }
  }

  return {
    fabrkPlugin,
    agentPlugin,
    dashboardPlugin,
    userConfigPath,
  };
}

async function dev(): Promise<void> {
  const root = process.cwd();
  const args = parseArgs(rawArgs);
  const port = typeof args.port === "string" ? parseInt(args.port, 10) : 5173;
  const host = typeof args.host === "string" ? args.host : args.host === true ? "0.0.0.0" : "localhost";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk dev v${VERSION}\n`);

  try {
    const { scanTools } = await import("./tools/scanner");
    const { loadToolDefinitions } = await import("./tools/loader");
    const scanned = scanTools(root);
    if (scanned.length > 0) {
      const toolDefs = await loadToolDefinitions(scanned);
      const { startMcpDevServer } = await import("./tools/mcp-dev-server");
      await startMcpDevServer(toolDefs);
      // eslint-disable-next-line no-console
      console.log(`  MCP server started with ${scanned.length} tool(s)\n`);
    }
  } catch (err) {
    console.warn("  [fabrk] Tool scanning failed:", err);
  }

  try {
    const { scanAgents } = await import("./agents/scanner");
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

  // When user has a vite.config with fabrk(), don't duplicate plugins
  const server = await createServer({
    configFile: userConfigPath ?? false,
    root,
    plugins: userConfigPath
      ? []
      : [fabrkPlugin(), agentPlugin(), dashboardPlugin()],
    server: {
      port,
      host,
    },
    ssr: {
      external: true,
    },
  });

  await server.listen();
  server.printUrls();
}

async function build(): Promise<void> {
  await runBuild(process.cwd(), rawArgs, VERSION, loadFabrkViteConfig);
}

async function start(): Promise<void> {
  const root = process.cwd();
  const args = parseArgs(rawArgs);
  const port = typeof args.port === "string" ? parseInt(args.port, 10) : 3000;
  const host = typeof args.host === "string" ? args.host : args.host === true ? "0.0.0.0" : "localhost";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk start v${VERSION}\n`);

  const distDir = path.join(root, "dist");
  if (!fs.existsSync(distDir)) {
    console.error("  No dist/ directory found. Run `fabrk build` first.");
    process.exit(1);
  }

  const serverDir = path.join(distDir, "server");
  const hasServerEntry = fs.existsSync(serverDir);

  if (hasServerEntry) {
    const { startProdServer } = await import("./runtime/prod-server");

    let serverEntryPath = "";
    const candidates = [
      path.join(serverDir, ".fabrk-server-entry.js"),
      path.join(serverDir, ".fabrk-server-entry.mjs"),
      path.join(serverDir, "entry.js"),
      path.join(serverDir, "entry.mjs"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        serverEntryPath = candidate;
        break;
      }
    }

    // Fall back to the first .js file in dist/server/
    if (!serverEntryPath) {
      const files = fs.readdirSync(serverDir).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
      if (files.length > 0) {
        serverEntryPath = path.join(serverDir, files[0]);
      }
    }

    if (!serverEntryPath) {
      console.error("  No server entry found in dist/server/. Run `fabrk build` first.");
      process.exit(1);
    }

    let middlewarePath: string | undefined;
    const middlewareCandidates = [
      path.join(serverDir, "middleware.js"),
      path.join(serverDir, "middleware.mjs"),
    ];
    for (const candidate of middlewareCandidates) {
      if (fs.existsSync(candidate)) {
        middlewarePath = candidate;
        break;
      }
    }

    await startProdServer({
      distDir,
      port,
      host,
      serverEntryPath,
      middlewarePath,
    });
  } else {
    // Fallback: use vite preview for static-only builds
    const { preview } = await import("vite");
    const { userConfigPath } = await loadFabrkViteConfig(root);

    const server = await preview({
      configFile: userConfigPath ?? false,
      root,
      preview: { port, host },
    });

    server.printUrls();
  }
}

async function info(): Promise<void> {
  const root = process.cwd();
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk info v${VERSION}\n`);

  try {
    const { scanAgents } = await import("./agents/scanner");
    const { scanTools } = await import("./tools/scanner");

    const agents = scanAgents(root);
    const tools = scanTools(root);

    const promptsDir = path.join(root, "prompts");
    const hasPrompts = fs.existsSync(promptsDir);
    const promptCount = hasPrompts
      ? fs.readdirSync(promptsDir).filter((f) => f.endsWith(".md")).length
      : 0;

    const hasConfig =
      fs.existsSync(path.join(root, "fabrk.config.ts")) ||
      fs.existsSync(path.join(root, "fabrk.config.js"));

    const hasAppDir =
      fs.existsSync(path.join(root, "app")) ||
      fs.existsSync(path.join(root, "src", "app"));

    // eslint-disable-next-line no-console
    console.log(
      `  Config:   ${hasConfig ? "fabrk.config.ts" : "none (using defaults)"}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Agents:   ${agents.length}${agents.length > 0 ? ` (${agents.map((a) => a.name).join(", ")})` : ""}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Tools:    ${tools.length}${tools.length > 0 ? ` (${tools.map((t) => t.name).join(", ")})` : ""}`
    );
    // eslint-disable-next-line no-console
    console.log(`  Prompts:  ${promptCount}`);
    // eslint-disable-next-line no-console
    console.log(`  App dir:  ${hasAppDir ? "yes" : "no"}`);
    // eslint-disable-next-line no-console
    console.log();
  } catch (err) {
    console.error("  Error scanning project:", err);
  }
}

async function agents(): Promise<void> {
  const root = process.cwd();
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk agents v${VERSION}\n`);

  try {
    const { scanAgents } = await import("./agents/scanner");
    const { scanTools } = await import("./tools/scanner");

    const scannedAgents = scanAgents(root);
    const scannedTools = scanTools(root);

    if (scannedAgents.length === 0) {
      // eslint-disable-next-line no-console
      console.log("  No agents found. Create agents in agents/ directory.\n");
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`  Found ${scannedAgents.length} agent(s):\n`);

    for (const agent of scannedAgents) {
      // eslint-disable-next-line no-console
      console.log(`  ${agent.name}`);
      // eslint-disable-next-line no-console
      console.log(`    Route:  ${agent.routePattern}`);
      // eslint-disable-next-line no-console
      console.log(`    File:   ${path.relative(root, agent.filePath)}`);

      try {
        const mod = await import(agent.filePath);
        const def = mod.default ?? mod;
        if (def && typeof def === "object") {
          if (typeof def.model === "string") {
            // eslint-disable-next-line no-console
            console.log(`    Model:  ${def.model}`);
          }
          if (Array.isArray(def.tools) && def.tools.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`    Tools:  ${def.tools.join(", ")}`);
          }
          if (def.memory) {
            // eslint-disable-next-line no-console
            console.log("    Memory: enabled");
          }
          if (def.auth) {
            // eslint-disable-next-line no-console
            console.log(`    Auth:   ${def.auth}`);
          }
        }
      } catch {
        // eslint-disable-next-line no-console
        console.log("    (could not load definition)");
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    if (scannedTools.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  Found ${scannedTools.length} tool(s): ${scannedTools.map((t) => t.name).join(", ")}\n`);
    }
  } catch (err) {
    console.error("  Error scanning project:", err);
  }
}

async function check(): Promise<void> {
  await runCheck(process.cwd(), VERSION);
}

async function test(): Promise<void> {
  const root = process.cwd();
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk test v${VERSION}\n`);

  try {
    const { execFileSync } = await import("node:child_process");

    // eslint-disable-next-line no-console
    console.log("  Running vitest...\n");

    execFileSync(process.execPath, [
      path.join(root, "node_modules/.bin/vitest"),
      "run",
      ...rawArgs,
    ], {
      cwd: root,
      stdio: "inherit",
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      process.exit((err as { status: number }).status);
    }
    console.error("  Failed to run tests. Is vitest installed?");
    process.exit(1);
  }
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
  fabrk v${VERSION} — AI-first full-stack framework

  Usage: fabrk <command> [options]

  Commands:
    dev      Start dev server with file-system routing + AI agents
    build    Build for production (client + SSR + sitemap + AGENTS.md)
    start    Start production server
    info     Show project agents, tools, and prompts
    agents   List all discovered agents with config details
    check    Run health/compatibility checks on the project
    test     Run project tests via vitest

  Options:
    --port <number>    Server port (dev: 5173, start: 3000)
    --host [address]   Bind to host (use --host for 0.0.0.0)
    --target <target>  Build target: "node" (default) or "worker"
    -h, --help         Show this help
    --version          Show version

  Examples:
    fabrk dev                  Start dev server with AI agents
    fabrk build                Build for production
    fabrk start                Start production server
    fabrk info                 Show agents, tools, prompts
    fabrk agents               List all agents and config
    fabrk check                Verify project health
    fabrk test                 Run agent tests
`);
}

if (command === "--version" || command === "-v") {
  // eslint-disable-next-line no-console
  console.log(`fabrk v${VERSION}`);
  process.exit(0);
}

if (command === "--help" || command === "-h" || !command) {
  printHelp();
  process.exit(0);
}

switch (command) {
  case "dev":
    dev().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "build":
    build().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "start":
    start().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "info":
    info().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "agents":
    agents().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "check":
    check().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  case "test":
    test().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  default:
    console.error(`\n  Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
}
