import path from "node:path";
import fs from "node:fs";
import type { FabrkConfig } from "../config/fabrk-config";
type ViteBuildFn = typeof import("vite")["build"];
type BuildPlugins = NonNullable<Parameters<ViteBuildFn>[0]>["plugins"];

export async function buildStaticPages(root: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("  [3/6] Static generation...");
  const serverDir = path.join(root, "dist", "server");
  if (!fs.existsSync(serverDir)) {
    // eslint-disable-next-line no-console
    console.log("        No server build, skipping.");
    return;
  }

  try {
    const serverFiles = fs.readdirSync(serverDir).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
    if (serverFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.log("        No server entry found, skipping.");
      return;
    }

    const serverEntry = await import(path.join(serverDir, serverFiles[0]));
    const { collectStaticRoutes, renderStaticPage } = await import("../runtime/static-export");
    const modulesMap = buildModulesMap(serverEntry);
    const layoutModulesMap = buildLayoutMap(serverEntry);

    const staticRoutes = await collectStaticRoutes({ routes: serverEntry.routes ?? [], modules: modulesMap });
    if (staticRoutes.length === 0) {
      // eslint-disable-next-line no-console
      console.log("        No static pages to generate.");
      return;
    }

    const clientDir = path.join(root, "dist", "client");
    let generated = 0;
    for (const sr of staticRoutes) {
      try {
        const mod = modulesMap.get(sr.route.filePath);
        if (!mod) continue;
        const html = await renderStaticPage(mod, sr.params, layoutModulesMap, sr.route.layoutPaths);
        const outPath = path.join(clientDir, sr.outputPath);
        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, html);
        generated++;
      } catch (err) { console.warn(`  [fabrk] Static render failed for ${sr.outputPath}:`, err); }
    }
    // eslint-disable-next-line no-console
    console.log(`        Generated ${generated} static page(s)`);
  } catch (err) { console.warn("  [fabrk] Static generation failed:", err); }
}

export async function buildSitemap(root: string, fabrkConfig: FabrkConfig): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("  [4/6] Sitemap generation...");
  if (!fabrkConfig.siteUrl) {
    // eslint-disable-next-line no-console
    console.log("        No siteUrl in fabrk.config — skipping. Set siteUrl to enable.");
    return;
  }

  try {
    const appDir = path.join(root, "app");
    if (!fs.existsSync(appDir)) {
      // eslint-disable-next-line no-console
      console.log("        No app/ directory, skipping.");
      return;
    }

    const { scanRoutes } = await import("../runtime/router");
    const { generateSitemap } = await import("../build/sitemap-gen");
    const routes = scanRoutes(appDir);
    if (routes.length === 0) {
      // eslint-disable-next-line no-console
      console.log("        No routes for sitemap.");
      return;
    }

    const clientDir = path.join(root, "dist", "client");
    await generateSitemap({ baseUrl: fabrkConfig.siteUrl, routes, outDir: clientDir });
    // eslint-disable-next-line no-console
    console.log(`        Generated sitemap.xml + robots.txt (${routes.filter((r) => r.type === "page").length} pages)`);
  } catch (err) { console.warn("  [fabrk] Sitemap generation failed:", err); }
}

export async function buildWorkerTarget(root: string, viteBuild: ViteBuildFn, buildPlugins: BuildPlugins): Promise<void> {
  const workerWrapper = [
    `import { createFetchHandler } from "${path.resolve(root, "node_modules/@fabrk/framework/dist/runtime/worker-entry.js")}";`,
    `import { routes, layoutModules, boundaryModules } from "./.fabrk-server-entry";`,
    `const modules = new Map(); routes.forEach(r => modules.set(r.filePath, r.module));`,
    `const layoutMap = new Map(); Object.entries(layoutModules).forEach(([k, v]) => layoutMap.set(k, v));`,
    `const handler = createFetchHandler({ routes, modules, layoutModules: layoutMap });`,
    `export default { fetch: handler.fetch };`,
  ].join("\n");

  const entryPath = path.join(root, ".fabrk-worker-entry.ts");
  fs.writeFileSync(entryPath, workerWrapper);
  try {
    await viteBuild({
      configFile: false, root,
      build: { ssr: entryPath, outDir: "dist/server", rollupOptions: { output: { entryFileNames: "worker.js" } } },
      plugins: buildPlugins,
    });
  } finally { if (fs.existsSync(entryPath)) fs.unlinkSync(entryPath); }
}

function buildModulesMap(entry: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  if (entry.routes) {
    for (const r of entry.routes as Array<{ filePath: string; module: Record<string, unknown> }>) map.set(r.filePath, r.module);
  }
  return map;
}

function buildLayoutMap(entry: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  if (entry.layoutModules) {
    for (const [k, v] of Object.entries(entry.layoutModules)) map.set(k, v as Record<string, unknown>);
  }
  return map;
}
