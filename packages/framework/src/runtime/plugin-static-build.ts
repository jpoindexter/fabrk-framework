import fs from "node:fs";
import path from "node:path";
import type { Route } from "./router";

export async function loadRouteModules(
  routes: Route[]
): Promise<Map<string, Record<string, unknown>>> {
  const modules = new Map<string, Record<string, unknown>>();
  for (const route of routes) {
    try {
      modules.set(route.filePath, await import(route.filePath));
    } catch { /* ignore missing modules */ }
  }
  return modules;
}

async function loadLayoutModules(
  layoutPaths: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const layoutModules = new Map<string, Record<string, unknown>>();
  for (const lp of layoutPaths) {
    try {
      layoutModules.set(lp, await import(lp));
    } catch { /* ignore */ }
  }
  return layoutModules;
}

export async function prerenderStaticPages(
  staticRoutes: Array<{ route: Route; params: Record<string, string>; outputPath: string }>,
  modules: Map<string, Record<string, unknown>>,
  root: string,
  outDir: string,
  renderStaticPage: (
    mod: Record<string, unknown>,
    params: Record<string, string>,
    layoutModules: Map<string, Record<string, unknown>>,
    layoutPaths: string[],
  ) => Promise<string>,
): Promise<{ prerendered: number; isrPrerendered: number }> {
  let prerendered = 0;
  let isrPrerendered = 0;
  const isrPreDir = path.resolve(root, "dist", "server", "isr-prerender");

  for (const { route, params, outputPath } of staticRoutes) {
    const mod = modules.get(route.filePath);

    if (mod && typeof mod.revalidate === "number") {
      isrPrerendered += await prerenderISRPage(
        mod, params, outputPath, route, isrPreDir, renderStaticPage,
      );
      continue;
    }

    try {
      const layoutModules = await loadLayoutModules(route.layoutPaths);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- module loaded above
      const html = await renderStaticPage(mod!, params, layoutModules, route.layoutPaths);
      const destPath = path.join(outDir, outputPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, html, "utf-8");
      prerendered++;
    } catch (err) {
      console.warn(`[fabrk] Static pre-render failed for ${route.pattern}:`, err);
    }
  }

  return { prerendered, isrPrerendered };
}

async function prerenderISRPage(
  mod: Record<string, unknown>,
  params: Record<string, string>,
  outputPath: string,
  route: Route,
  isrPreDir: string,
  renderStaticPage: (
    mod: Record<string, unknown>,
    params: Record<string, string>,
    layoutModules: Map<string, Record<string, unknown>>,
    layoutPaths: string[],
  ) => Promise<string>,
): Promise<number> {
  try {
    const layoutModules = await loadLayoutModules(route.layoutPaths);
    const html = await renderStaticPage(mod, params, layoutModules, route.layoutPaths);
    const safeKey = outputPath.replace(/\//g, "__").replace(/\.html$/, ".json");
    fs.mkdirSync(isrPreDir, { recursive: true });
    fs.writeFileSync(path.join(isrPreDir, safeKey), JSON.stringify({
      pathname: outputPath.replace(/\/index\.html$/, "") || "/",
      html,
      revalidate: mod.revalidate as number,
      tags: Array.isArray(mod.tags) ? mod.tags : [],
    }), "utf-8");
    return 1;
  } catch (err) {
    console.warn(`[fabrk] ISR pre-render failed for ${route.pattern}:`, err);
    return 0;
  }
}

export async function generateSitemapSafe(
  root: string,
  routes: Route[],
  modules: Map<string, Record<string, unknown>>,
  outDir: string,
): Promise<void> {
  try {
    const { generateSitemap } = await import("../build/sitemap-gen");
    const { loadFabrkConfig } = await import("../config/fabrk-config");
    const fabrkConfig = await loadFabrkConfig(root).catch(() => ({}));
    const baseUrl = (fabrkConfig as Record<string, unknown>).baseUrl as string | undefined
      ?? "http://localhost:3000";
    await generateSitemap({ baseUrl, routes, modules, outDir });
    console.warn(`[fabrk] Generated sitemap.xml and robots.txt`);
  } catch (err) {
    console.warn("[fabrk] Sitemap generation failed:", err);
  }
}
