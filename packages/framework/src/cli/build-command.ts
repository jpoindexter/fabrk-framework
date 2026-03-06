import path from "node:path";
import fs from "node:fs";
import { parseArgs } from "./parse-args";
import { loadFabrkViteConfig } from "./load-config";
import { buildStaticPages, buildSitemap, buildWorkerTarget } from "./build-steps";
import { generateAgentsMdFile } from "./build-agents";

type ViteBuildFn = typeof import("vite")["build"];
type BuildPlugins = NonNullable<Parameters<ViteBuildFn>[0]>["plugins"];

export async function runBuild(
  root: string,
  rawArgs: string[],
  version: string,
): Promise<void> {
  const args = parseArgs(rawArgs);
  const target = typeof args.target === "string" ? args.target : "node";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk build v${version} (target: ${target})\n`);

  const { loadFabrkConfig } = await import("../config/fabrk-config");
  const fabrkConfig = await loadFabrkConfig(root);

  const { build: viteBuild } = await import("vite");
  const { fabrkPlugin, agentPlugin, dashboardPlugin, userConfigPath } =
    await loadFabrkViteConfig(root);

  const buildPlugins = userConfigPath
    ? []
    : [fabrkPlugin(), agentPlugin(), dashboardPlugin()] as BuildPlugins;

  // Step 1: Client build
  // eslint-disable-next-line no-console
  console.log("  [1/6] Building client bundle...");
  await viteBuild({
    configFile: userConfigPath ?? false,
    root,
    plugins: buildPlugins,
    build: { outDir: "dist/client", manifest: true },
  });

  // Step 2: SSR build
  await buildServer(root, target, viteBuild, buildPlugins, userConfigPath);

  // Step 3: Static generation
  await buildStaticPages(root);

  // Step 4: Sitemap
  await buildSitemap(root, fabrkConfig);

  // Step 5: AGENTS.md
  await buildAgentsMdStep(root);

  // Step 6: Done
  printBuildSummary(root);
}

async function buildAgentsMdStep(root: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("  [5/6] Generating AGENTS.md...");
  try {
    const generated = await generateAgentsMdFile(root);
    if (!generated) {
      // eslint-disable-next-line no-console
      console.log("        No agents or tools found, skipping.");
    }
  } catch (err) {
    console.warn("  [fabrk] AGENTS.md generation failed:", err);
  }
}

function printBuildSummary(root: string): void {
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

async function buildServer(
  root: string,
  target: string,
  viteBuild: ViteBuildFn,
  buildPlugins: BuildPlugins,
  userConfigPath: string | undefined,
): Promise<void> {
  const appDir = path.join(root, "app");
  if (!fs.existsSync(appDir)) {
    // eslint-disable-next-line no-console
    console.log("  [2/6] No app/ directory, skipping server build.");
    return;
  }

  const { scanRoutes } = await import("../runtime/router");
  const routes = scanRoutes(appDir);
  if (routes.length === 0) {
    // eslint-disable-next-line no-console
    console.log("  [2/6] No routes found, skipping server build.");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("  [2/6] Building server bundle...");
  const { generateServerEntry } = await import("../runtime/server-entry-gen");
  const entrySource = generateServerEntry(routes, appDir);
  const tmpEntryPath = path.join(root, ".fabrk-server-entry.ts");
  fs.writeFileSync(tmpEntryPath, entrySource);

  try {
    if (target === "worker") {
      await buildWorkerTarget(root, viteBuild, buildPlugins);
    } else {
      await viteBuild({
        configFile: userConfigPath ?? false,
        root,
        build: { ssr: tmpEntryPath, outDir: "dist/server" },
        plugins: buildPlugins,
      });
    }
  } finally {
    if (fs.existsSync(tmpEntryPath)) fs.unlinkSync(tmpEntryPath);
  }
}

