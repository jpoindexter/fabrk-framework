/** SSR page module loading and metadata resolution. */

import type { ViteDevServer } from "vite";
import type { RouteMatch } from "./router-types";
import type { Metadata } from "./metadata";
import { resolveMetadata, mergeMetadata } from "./metadata";
import type { PageModules } from "./page-builder";
import { findFile } from "./route-scanner";
import { buildSecurityHeaders } from "../middleware/security";
import { sanitizeRouteHeaders } from "./ssr-sanitize";
import { renderPage, handlePageError } from "./ssr-renderer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReactModuleLoader = () => Promise<[any, any]>;

async function loadSlots(route: RouteMatch["route"], viteServer: ViteDevServer): Promise<Record<string, React.ComponentType>> {
  const slotComponents: Record<string, React.ComponentType> = {};
  if (route.slots) {
    for (const [slotName, slotPath] of Object.entries(route.slots)) {
      try {
        const slotMod = await viteServer.ssrLoadModule(slotPath);
        if (typeof slotMod.default === "function") slotComponents[slotName] = slotMod.default;
      } catch { /* slot failed to load — skip */ }
    }
  }
  if (route.slotDefaults) {
    for (const [slotName, defaultPath] of Object.entries(route.slotDefaults)) {
      if (!slotComponents[slotName]) {
        try {
          const defaultMod = await viteServer.ssrLoadModule(defaultPath);
          if (typeof defaultMod.default === "function") slotComponents[slotName] = defaultMod.default;
        } catch { /* default slot failed — skip */ }
      }
    }
  }
  return slotComponents;
}

async function loadIslands(route: RouteMatch["route"], viteServer: ViteDevServer): Promise<Record<string, React.ComponentType>> {
  const islandComponents: Record<string, React.ComponentType> = {};
  if (route.islands) {
    for (const [islandName, islandPath] of Object.entries(route.islands)) {
      try {
        const islandMod = await viteServer.ssrLoadModule(islandPath);
        if (typeof islandMod.default === "function") islandComponents[islandName] = islandMod.default;
      } catch { /* island failed to load — skip */ }
    }
  }
  return islandComponents;
}

type BoundaryKeys = "errorFallback" | "loadingFallback" | "notFoundFallback" | "globalErrorFallback";

async function loadBoundaries(
  route: RouteMatch["route"], viteServer: ViteDevServer, appDir?: string,
): Promise<Pick<PageModules, BoundaryKeys>> {
  const result: Pick<PageModules, BoundaryKeys> = {};
  for (const [key, filePath] of [
    ["errorFallback", route.errorPath],
    ["loadingFallback", route.loadingPath],
    ["notFoundFallback", route.notFoundPath],
  ] as const) {
    if (!filePath) continue;
    try {
      const mod = await viteServer.ssrLoadModule(filePath);
      if (typeof mod.default === "function") result[key] = mod.default;
    } catch { /* boundary file failed to load — skip */ }
  }
  if (appDir) {
    const globalErrorPath = findFile(appDir, "global-error");
    if (globalErrorPath) {
      try {
        const mod = await viteServer.ssrLoadModule(globalErrorPath);
        if (typeof mod.default === "function") result.globalErrorFallback = mod.default;
      } catch { /* skip */ }
    }
  }
  return result;
}

async function resolvePageMetadata(
  pageMod: Record<string, unknown>,
  layoutMods: Map<string, Record<string, unknown>>,
  layoutPaths: string[],
  metadataContext: { params: Record<string, string>; searchParams: Record<string, string> },
  viteServer: ViteDevServer,
): Promise<{ metadata: Metadata; routeHeaders: Record<string, string> }> {
  const metadataLayers: Metadata[] = [];
  for (const layoutPath of layoutPaths) {
    const layoutMod = layoutMods.get(layoutPath) ?? await viteServer.ssrLoadModule(layoutPath);
    metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
  }
  metadataLayers.push(await resolveMetadata(pageMod, metadataContext));
  let routeHeaders: Record<string, string> = {};
  if (typeof pageMod.headers === "function") {
    try {
      const h = await pageMod.headers(metadataContext);
      if (h && typeof h === "object") routeHeaders = sanitizeRouteHeaders(h as Record<string, string>);
    } catch { /* skip invalid headers export */ }
  }
  return { metadata: mergeMetadata(metadataLayers), routeHeaders };
}

export async function handlePageRoute(
  request: Request, matched: RouteMatch, viteServer: ViteDevServer,
  htmlShell: (options: { head: string; body: string }) => string,
  reactLoader?: ReactModuleLoader, appDir?: string, locale?: string,
): Promise<Response> {
  try {
    const pageMod = await viteServer.ssrLoadModule(matched.route.filePath);
    const PageComponent = pageMod.default;
    if (typeof PageComponent !== "function") {
      return new Response("Page component must export a default function", {
        status: 500, headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }
    const layoutMods = new Map<string, Record<string, unknown>>();
    const layouts: Array<React.ComponentType<{ children: React.ReactNode }>> = [];
    for (const layoutPath of matched.route.layoutPaths) {
      const layoutMod = await viteServer.ssrLoadModule(layoutPath);
      layoutMods.set(layoutPath, layoutMod);
      if (typeof layoutMod.default === "function") layouts.push(layoutMod.default);
    }
    const slotComponents = await loadSlots(matched.route, viteServer);
    const islandComponents = await loadIslands(matched.route, viteServer);
    const boundaries = await loadBoundaries(matched.route, viteServer, appDir);
    const modules: PageModules = {
      page: PageComponent, layouts,
      slots: Object.keys(slotComponents).length > 0 ? slotComponents : undefined,
      islands: Object.keys(islandComponents).length > 0 ? islandComponents : undefined,
      ...boundaries,
    };
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const pageProps = locale
      ? { params: matched.params, searchParams, locale }
      : { params: matched.params, searchParams };
    const { metadata, routeHeaders } = await resolvePageMetadata(
      pageMod, layoutMods, matched.route.layoutPaths,
      { params: matched.params, searchParams }, viteServer,
    );
    return await renderPage(matched, modules, pageProps, layouts, metadata, routeHeaders, viteServer, htmlShell, reactLoader, url);
  } catch (err) {
    return handlePageError(err);
  }
}
