import path from "node:path";
import fs from "node:fs";

type ViteBuildFn = typeof import("vite")["build"];
type BuildPlugins = NonNullable<Parameters<ViteBuildFn>[0]>["plugins"];

export async function runBuild(
  root: string,
  rawArgs: string[],
  version: string,
  loadFabrkViteConfig: (root: string) => Promise<{
    fabrkPlugin: () => unknown;
    agentPlugin: () => unknown;
    dashboardPlugin: () => unknown;
    userConfigPath: string | undefined;
  }>
): Promise<void> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith("--")) { args[key] = next; i++; }
      else args[key] = true;
    }
  }
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
    const { scanRoutes } = await import("../runtime/router");
    const routes = scanRoutes(appDir);

    if (routes.length > 0) {
      // eslint-disable-next-line no-console
      console.log("  [2/6] Building server bundle...");

      const { generateServerEntry } = await import("../runtime/server-entry-gen");
      const entrySource = generateServerEntry(routes, appDir);

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
      const serverFiles = fs.readdirSync(serverDir).filter(
        (f) => f.endsWith(".js") || f.endsWith(".mjs"),
      );
      if (serverFiles.length > 0) {
        const serverEntryPath = path.join(serverDir, serverFiles[0]);
        const serverEntry = await import(serverEntryPath);

        const { collectStaticRoutes, renderStaticPage } = await import(
          "../runtime/static-export"
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
      const sitemapAppDir = path.join(root, "app");
      if (fs.existsSync(sitemapAppDir)) {
        const { scanRoutes } = await import("../runtime/router");
        const { generateSitemap } = await import("../build/sitemap-gen");
        const sitemapRoutes = scanRoutes(sitemapAppDir);

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
    const { scanAgents } = await import("../agents/scanner");
    const { scanTools } = await import("../tools/scanner");

    const scannedAgents = scanAgents(root);
    const scannedTools = scanTools(root);

    if (scannedAgents.length > 0 || scannedTools.length > 0) {
      const { generateAgentsMd } = await import("../build/agents-md");
      const { loadToolDefinitions } = await import("../tools/loader");

      const toolDefs = await loadToolDefinitions(scannedTools);

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
