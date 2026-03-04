#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";

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
  const root = process.cwd();
  const args = parseArgs(rawArgs);
  const target = typeof args.target === "string" ? args.target : "node";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk build v${VERSION} (target: ${target})\n`);

  const { loadFabrkConfig } = await import("./config/fabrk-config");
  const fabrkConfig = await loadFabrkConfig(root);

  const { build: viteBuild } = await import("vite");
  const { fabrkPlugin, agentPlugin, dashboardPlugin, userConfigPath } =
    await loadFabrkViteConfig(root);

  const buildPlugins = userConfigPath
    ? []
    : [fabrkPlugin(), agentPlugin(), dashboardPlugin()];

  // Step 1: Client build → dist/client/
  // eslint-disable-next-line no-console
  console.log("  [1/6] Building client bundle...");
  await viteBuild({
    configFile: userConfigPath ?? false,
    root,
    plugins: buildPlugins,
    build: {
      outDir: "dist/client",
      manifest: true,
    },
  });

  // Step 2: SSR build → dist/server/
  const appDir = path.join(root, "app");
  if (fs.existsSync(appDir)) {
    const { scanRoutes } = await import("./runtime/router");
    const routes = scanRoutes(appDir);

    if (routes.length > 0) {
      // eslint-disable-next-line no-console
      console.log("  [2/6] Building server bundle...");

      const { generateServerEntry } = await import("./runtime/server-entry-gen");
      const entrySource = generateServerEntry(routes, appDir);

      // Write generated entry to temp file
      const tmpEntryPath = path.join(root, ".fabrk-server-entry.ts");
      fs.writeFileSync(tmpEntryPath, entrySource);

      try {
        if (target === "worker") {
          // Worker build — export default { fetch } format
          const workerWrapper = `
import { createFetchHandler } from "${path.resolve(root, "node_modules/@fabrk/framework/dist/runtime/worker-entry.js")}";
import { routes, layoutModules, boundaryModules } from "./.fabrk-server-entry";

const modules = new Map();
routes.forEach(r => modules.set(r.filePath, r.module));

const layoutMap = new Map();
Object.entries(layoutModules).forEach(([k, v]) => layoutMap.set(k, v));

const handler = createFetchHandler({
  routes,
  modules,
  layoutModules: layoutMap,
});

export default { fetch: handler.fetch };
`;
          const workerEntryPath = path.join(root, ".fabrk-worker-entry.ts");
          fs.writeFileSync(workerEntryPath, workerWrapper);

          await viteBuild({
            configFile: false,
            root,
            build: {
              ssr: workerEntryPath,
              outDir: "dist/server",
              rollupOptions: {
                output: { entryFileNames: "worker.js" },
              },
            },
            plugins: buildPlugins,
          });

          // Cleanup
          fs.unlinkSync(workerEntryPath);
        } else {
          // Node SSR build
          await viteBuild({
            configFile: userConfigPath ?? false,
            root,
            build: {
              ssr: tmpEntryPath,
              outDir: "dist/server",
            },
            plugins: buildPlugins,
          });
        }
      } finally {
        // Cleanup temp entry
        if (fs.existsSync(tmpEntryPath)) {
          fs.unlinkSync(tmpEntryPath);
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("  [2/6] No routes found, skipping server build.");
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("  [2/6] No app/ directory, skipping server build.");
  }

  // Step 3: Static generation (pre-render eligible pages)
  // eslint-disable-next-line no-console
  console.log("  [3/6] Static generation...");
  const serverDir = path.join(root, "dist", "server");
  if (fs.existsSync(serverDir)) {
    try {
      // Find the built server entry
      const serverFiles = fs.readdirSync(serverDir).filter(
        (f) => f.endsWith(".js") || f.endsWith(".mjs"),
      );
      if (serverFiles.length > 0) {
        const serverEntryPath = path.join(serverDir, serverFiles[0]);
        const serverEntry = await import(serverEntryPath);

        const { collectStaticRoutes, renderStaticPage } = await import(
          "./runtime/static-export"
        );

        const modulesMap = new Map<string, Record<string, unknown>>();
        if (serverEntry.routes) {
          for (const r of serverEntry.routes) {
            modulesMap.set(r.filePath, r.module);
          }
        }

        const layoutModulesMap = new Map<string, Record<string, unknown>>();
        if (serverEntry.layoutModules) {
          for (const [k, v] of Object.entries(serverEntry.layoutModules)) {
            layoutModulesMap.set(k, v as Record<string, unknown>);
          }
        }

        const staticRoutes = await collectStaticRoutes({
          routes: serverEntry.routes ?? [],
          modules: modulesMap,
        });

        if (staticRoutes.length > 0) {
          const clientDir = path.join(root, "dist", "client");
          let generated = 0;

          for (const sr of staticRoutes) {
            try {
              const mod = modulesMap.get(sr.route.filePath);
              if (!mod) continue;

              const html = await renderStaticPage(
                mod,
                sr.params,
                layoutModulesMap,
                sr.route.layoutPaths,
              );

              const outPath = path.join(clientDir, sr.outputPath);
              const outDir = path.dirname(outPath);
              if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
              }
              fs.writeFileSync(outPath, html);
              generated++;
            } catch (err) {
              console.warn(
                `  [fabrk] Static render failed for ${sr.outputPath}:`,
                err,
              );
            }
          }

          // eslint-disable-next-line no-console
          console.log(
            `        Generated ${generated} static page(s)`,
          );
        } else {
          // eslint-disable-next-line no-console
          console.log("        No static pages to generate.");
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("        No server entry found, skipping.");
      }
    } catch (err) {
      console.warn("  [fabrk] Static generation failed:", err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("        No server build, skipping.");
  }

  // Step 4: Sitemap + robots.txt
  // eslint-disable-next-line no-console
  console.log("  [4/6] Sitemap generation...");
  if (fabrkConfig.siteUrl) {
    try {
      const appDir = path.join(root, "app");
      if (fs.existsSync(appDir)) {
        const { scanRoutes } = await import("./runtime/router");
        const { generateSitemap } = await import("./build/sitemap-gen");
        const sitemapRoutes = scanRoutes(appDir);

        if (sitemapRoutes.length > 0) {
          const clientDir = path.join(root, "dist", "client");
          await generateSitemap({
            baseUrl: fabrkConfig.siteUrl,
            routes: sitemapRoutes,
            outDir: clientDir,
          });
          // eslint-disable-next-line no-console
          console.log(
            `        Generated sitemap.xml + robots.txt (${sitemapRoutes.filter((r) => r.type === "page").length} pages)`
          );
        } else {
          // eslint-disable-next-line no-console
          console.log("        No routes for sitemap.");
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("        No app/ directory, skipping.");
      }
    } catch (err) {
      console.warn("  [fabrk] Sitemap generation failed:", err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("        No siteUrl in fabrk.config — skipping. Set siteUrl to enable.");
  }

  // Step 5: Generate AGENTS.md
  // eslint-disable-next-line no-console
  console.log("  [5/6] Generating AGENTS.md...");
  try {
    const { scanAgents } = await import("./agents/scanner");
    const { scanTools } = await import("./tools/scanner");

    const scannedAgents = scanAgents(root);
    const scannedTools = scanTools(root);

    if (scannedAgents.length > 0 || scannedTools.length > 0) {
      const { generateAgentsMd } = await import("./build/agents-md");
      const { loadToolDefinitions } = await import("./tools/loader");

      // Load real tool definitions for descriptions
      const toolDefs = await loadToolDefinitions(scannedTools);

      // Load real agent definitions
      const agentEntries = await Promise.all(
        scannedAgents.map(async (a) => {
          try {
            const mod = await import(a.filePath);
            const def = mod.default ?? mod;
            if (def && typeof def === "object" && typeof def.model === "string") {
              return {
                name: a.name,
                route: a.routePattern,
                model: def.model as string,
                auth: (def.auth as string) ?? "none",
                tools: (def.tools as string[]) ?? [],
              };
            }
          } catch { /* skip invalid agent files */ }
          return {
            name: a.name,
            route: a.routePattern,
            model: "default",
            auth: "none",
            tools: [] as string[],
          };
        })
      );

      const md = generateAgentsMd({
        agents: agentEntries,
        tools: toolDefs.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        prompts: [],
      });

      const outPath = path.join(root, "AGENTS.md");
      fs.writeFileSync(outPath, md);
      // eslint-disable-next-line no-console
      console.log(
        `        Generated (${scannedAgents.length} agents, ${scannedTools.length} tools)`
      );
    } else {
      // eslint-disable-next-line no-console
      console.log("        No agents or tools found, skipping.");
    }
  } catch (err) {
    console.warn("  [fabrk] AGENTS.md generation failed:", err);
  }

  // Step 5: Done
  // eslint-disable-next-line no-console
  console.log("  [6/6] Build complete.\n");
  // eslint-disable-next-line no-console
  console.log("  Output:");
  // eslint-disable-next-line no-console
  console.log("    dist/client/ — static assets");
  if (fs.existsSync(path.join(root, "dist", "server"))) {
    // eslint-disable-next-line no-console
    console.log("    dist/server/ — SSR bundle");
  }
  // eslint-disable-next-line no-console
  console.log("\n  Run `fabrk start` to serve.\n");
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
    // Use our production server with SSR
    const { startProdServer } = await import("./runtime/prod-server");

    // Find the server entry file (could be .js or .mjs)
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

    // If no specific entry found, look for any .js file
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

    // Check for built middleware
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
  const root = process.cwd();
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk check v${VERSION}\n`);

  let issues = 0;

  // Check Node.js version
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split(".")[0], 10);
  if (majorVersion < 22) {
    // eslint-disable-next-line no-console
    console.log(`  [WARN] Node.js ${nodeVersion} detected — Node.js 22+ recommended`);
    issues++;
  } else {
    // eslint-disable-next-line no-console
    console.log(`  [OK]   Node.js ${nodeVersion}`);
  }

  // Check for package.json
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   package.json found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [FAIL] No package.json found");
    issues++;
  }

  // Check for fabrk config
  const hasConfigTs = fs.existsSync(path.join(root, "fabrk.config.ts"));
  const hasConfigJs = fs.existsSync(path.join(root, "fabrk.config.js"));
  if (hasConfigTs || hasConfigJs) {
    // eslint-disable-next-line no-console
    console.log(`  [OK]   ${hasConfigTs ? "fabrk.config.ts" : "fabrk.config.js"} found`);
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No fabrk.config found (using defaults)");
  }

  // Check for app directory
  const hasAppDir = fs.existsSync(path.join(root, "app"));
  if (hasAppDir) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   app/ directory found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No app/ directory (no file-system routing)");
  }

  // Check for vite config
  const viteConfigs = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  const hasViteConfig = viteConfigs.some((f) => fs.existsSync(path.join(root, f)));
  if (hasViteConfig) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   Vite config found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No vite config (fabrk will use defaults)");
  }

  // Check agents
  try {
    const { scanAgents } = await import("./agents/scanner");
    const agents = scanAgents(root);
    if (agents.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  [OK]   ${agents.length} agent(s) discovered`);

      // Validate agent definitions
      for (const agent of agents) {
        try {
          const mod = await import(agent.filePath);
          const def = mod.default ?? mod;
          if (!def || typeof def !== "object") {
            // eslint-disable-next-line no-console
            console.log(`  [WARN] Agent "${agent.name}" has no valid definition export`);
            issues++;
          } else if (typeof def.model !== "string") {
            // eslint-disable-next-line no-console
            console.log(`  [WARN] Agent "${agent.name}" is missing a "model" field`);
            issues++;
          }
        } catch {
          // eslint-disable-next-line no-console
          console.log(`  [WARN] Agent "${agent.name}" failed to load — check for syntax errors`);
          issues++;
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("  [INFO] No agents found");
    }
  } catch {
    // eslint-disable-next-line no-console
    console.log("  [INFO] Agent scanning not available");
  }

  // Check tools
  try {
    const { scanTools } = await import("./tools/scanner");
    const tools = scanTools(root);
    if (tools.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  [OK]   ${tools.length} tool(s) discovered`);
    } else {
      // eslint-disable-next-line no-console
      console.log("  [INFO] No tools found");
    }
  } catch {
    // eslint-disable-next-line no-console
    console.log("  [INFO] Tool scanning not available");
  }

  // Check for TypeScript
  const hasTsConfig = fs.existsSync(path.join(root, "tsconfig.json"));
  if (hasTsConfig) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   tsconfig.json found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No tsconfig.json");
  }

  // eslint-disable-next-line no-console
  console.log();
  if (issues === 0) {
    // eslint-disable-next-line no-console
    console.log("  All checks passed.\n");
  } else {
    // eslint-disable-next-line no-console
    console.log(`  ${issues} issue(s) found.\n`);
  }
}

async function test(): Promise<void> {
  const root = process.cwd();
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk test v${VERSION}\n`);

  // Check if vitest is available
  try {
    const { execFileSync } = await import("node:child_process");

    // Look for test files
    const testPatterns = [
      path.join(root, "**/*.test.ts"),
      path.join(root, "**/*.test.tsx"),
      path.join(root, "**/*.spec.ts"),
      path.join(root, "**/*.spec.tsx"),
    ];

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
