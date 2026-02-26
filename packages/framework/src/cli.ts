#!/usr/bin/env node

/**
 * fabrk CLI — AI-first full-stack framework built on vinext
 *
 * Most commands delegate to vinext. Fabrk adds:
 *   - Agent/tool scanning on `dev`
 *   - AGENTS.md generation on `build`
 *   - `info` command to show project agents/tools/prompts
 *
 * Usage:
 *   fabrk dev       Start dev server (vinext + MCP + agent scanning)
 *   fabrk build     Build for production (vinext + AGENTS.md)
 *   fabrk start     Start production server (vinext)
 *   fabrk deploy    Deploy to Cloudflare Workers (vinext)
 *   fabrk info      Show agents, tools, prompts in this project
 *   fabrk init      Migrate a Next.js project (vinext)
 *   fabrk check     Check compatibility (vinext)
 *   fabrk lint      Run linter (vinext)
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const VERSION = "0.1.0";
const command = process.argv[2];
const rawArgs = process.argv.slice(3);

// ─── Vinext passthrough ─────────────────────────────────────────────────────

/**
 * Delegate a command to the vinext CLI. Uses execFile (not exec) to
 * prevent shell injection.
 */
function vinextPassthrough(cmd: string, args: string[] = []): void {
  const vinextBin = resolveVinextBin();
  try {
    execFileSync(vinextBin, [cmd, ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
  } catch (err: unknown) {
    const code = (err as { status?: number }).status ?? 1;
    process.exit(code);
  }
}

/** Find the vinext CLI binary in node_modules */
function resolveVinextBin(): string {
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vinext");
  if (fs.existsSync(localBin)) return localBin;

  // Try resolving from fabrk's own dependencies
  try {
    const vinextPkg = require.resolve("vinext/package.json");
    const vinextDir = path.dirname(vinextPkg);
    const vinextPkgJson = JSON.parse(fs.readFileSync(path.join(vinextDir, "package.json"), "utf-8"));
    const binEntry = typeof vinextPkgJson.bin === "string"
      ? vinextPkgJson.bin
      : vinextPkgJson.bin?.vinext;
    if (binEntry) return path.join(vinextDir, binEntry);
  } catch {
    // Fall through
  }

  // Last resort: assume it's on PATH
  return "vinext";
}

// ─── Fabrk-specific commands ────────────────────────────────────────────────

async function dev(): Promise<void> {
  console.log(`\n  fabrk dev v${VERSION}  (powered by vinext)\n`);

  // Start MCP dev server if tools/ exists
  try {
    const { scanTools } = await import("./tools/scanner.js");
    const { loadToolDefinitions } = await import("./tools/loader.js");
    const scanned = scanTools(process.cwd());
    if (scanned.length > 0) {
      const toolDefs = await loadToolDefinitions(scanned);
      const { startMcpDevServer } = await import("./tools/mcp-dev-server.js");
      await startMcpDevServer(toolDefs);
      console.log(`  MCP server started with ${scanned.length} tool(s)\n`);
    }
  } catch {
    // MCP server is optional
  }

  // Log discovered agents
  try {
    const { scanAgents } = await import("./agents/scanner.js");
    const agents = scanAgents(process.cwd());
    if (agents.length > 0) {
      console.log(
        `  Discovered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}\n`
      );
    }
  } catch {
    // Agent scanning is optional
  }

  // Delegate to vinext dev
  vinextPassthrough("dev", rawArgs);
}

async function build(): Promise<void> {
  console.log(`\n  fabrk build v${VERSION}  (powered by vinext)\n`);

  // Run vinext build first
  vinextPassthrough("build", rawArgs);

  // Generate AGENTS.md after build
  try {
    const { scanAgents } = await import("./agents/scanner.js");
    const { scanTools } = await import("./tools/scanner.js");

    const scannedAgents = scanAgents(process.cwd());
    const scannedTools = scanTools(process.cwd());

    if (scannedAgents.length > 0 || scannedTools.length > 0) {
      const { generateAgentsMd } = await import("./build/agents-md.js");

      const md = generateAgentsMd({
        agents: scannedAgents.map((a) => ({
          name: a.name,
          route: a.routePattern,
          model: "default",
          auth: "none",
          tools: [] as string[],
        })),
        tools: scannedTools.map((t) => ({
          name: t.name,
          description: `Tool: ${t.name}`,
        })),
        prompts: [],
      });

      const outPath = path.join(process.cwd(), "AGENTS.md");
      fs.writeFileSync(outPath, md);
      console.log(
        `\n  Generated AGENTS.md (${scannedAgents.length} agents, ${scannedTools.length} tools)`
      );
    }
  } catch {
    // Agent/tool scanning is optional
  }
}

async function info(): Promise<void> {
  const root = process.cwd();
  console.log(`\n  fabrk info v${VERSION}\n`);

  // Scan project
  try {
    const { scanAgents } = await import("./agents/scanner.js");
    const { scanTools } = await import("./tools/scanner.js");

    const agents = scanAgents(root);
    const tools = scanTools(root);

    // Check for prompts
    const promptsDir = path.join(root, "prompts");
    const hasPrompts = fs.existsSync(promptsDir);
    const promptCount = hasPrompts
      ? fs.readdirSync(promptsDir).filter((f) => f.endsWith(".md")).length
      : 0;

    // Check for config
    const hasConfig =
      fs.existsSync(path.join(root, "fabrk.config.ts")) ||
      fs.existsSync(path.join(root, "fabrk.config.js"));

    // Check for app dir
    const hasAppDir =
      fs.existsSync(path.join(root, "app")) ||
      fs.existsSync(path.join(root, "src", "app"));

    console.log(
      `  Config:   ${hasConfig ? "fabrk.config.ts" : "none (using defaults)"}`
    );
    console.log(
      `  Agents:   ${agents.length}${agents.length > 0 ? ` (${agents.map((a) => a.name).join(", ")})` : ""}`
    );
    console.log(
      `  Tools:    ${tools.length}${tools.length > 0 ? ` (${tools.map((t) => t.name).join(", ")})` : ""}`
    );
    console.log(`  Prompts:  ${promptCount}`);
    console.log(`  App dir:  ${hasAppDir ? "yes" : "no"}`);
    console.log();
  } catch (err) {
    console.error("  Error scanning project:", err);
  }
}

// ─── Help ───────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  fabrk v${VERSION} — AI-first full-stack framework built on vinext

  Usage: fabrk <command> [options]

  Commands:
    dev      Start dev server (vinext + AI agents + MCP server)
    build    Build for production (vinext + AGENTS.md generation)
    start    Start production server (vinext)
    deploy   Deploy to Cloudflare Workers (vinext)
    info     Show project agents, tools, and prompts
    init     Migrate a Next.js project to vinext
    check    Check Next.js compatibility
    lint     Run linter

  Options:
    -h, --help     Show this help
    --version      Show version

  Powered by vinext (https://github.com/cloudflare/vinext)

  Examples:
    fabrk dev                  Start dev server with AI agents
    fabrk build                Build + generate AGENTS.md
    fabrk deploy               Deploy to Cloudflare Workers
    fabrk info                 Show agents, tools, prompts
`);
}

// ─── Entry ──────────────────────────────────────────────────────────────────

if (command === "--version" || command === "-v") {
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

  case "info":
    info().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;

  // These delegate directly to vinext
  case "start":
  case "deploy":
  case "init":
  case "check":
  case "lint":
    vinextPassthrough(command, rawArgs);
    break;

  default:
    console.error(`\n  Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
}
