/**
 * File-system route scanning: walk the app directory to discover page and API routes.
 */

import fs from "node:fs";
import path from "node:path";
import type { Route } from "./router-types";
import { PARALLEL_SLOT_SEG, dirToPattern, patternToRegex, detectInterceptingRoute } from "./route-pattern";
import { collectLayouts, collectBoundaries } from "./route-boundaries";

export { collectLayouts, collectBoundaries } from "./route-boundaries";
export const PAGE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const ISLAND_FILE = /^island\.([a-zA-Z0-9_-]+)\.(tsx|ts|jsx|js)$/;

export function scanRoutes(appDir: string): Route[] {
  if (!fs.existsSync(appDir)) return [];
  const routes: Route[] = [];
  walkDir(appDir, appDir, routes);
  routes.sort((a, b) => routeWeight(a) - routeWeight(b));
  return routes;
}

export function findFile(dir: string, baseName: string): string | null {
  for (const ext of PAGE_EXTENSIONS) {
    const filePath = path.join(dir, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function walkDir(dir: string, appDir: string, routes: Route[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }

  const slots: Record<string, string> = {};
  const slotDefaults: Record<string, string> = {};

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const slotMatch = PARALLEL_SLOT_SEG.exec(entry.name);
      if (slotMatch) {
        const slotName = slotMatch[1];
        const slotPage = findFile(fullPath, "page");
        if (slotPage) slots[slotName] = slotPage;
        const slotDefault = findFile(fullPath, "default");
        if (slotDefault) slotDefaults[slotName] = slotDefault;
        continue;
      }
      walkDir(fullPath, appDir, routes);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    const baseName = path.basename(entry.name, ext);
    if (!PAGE_EXTENSIONS.includes(ext)) continue;

    if (baseName === "page") {
      registerPageRoute(fullPath, appDir, routes);
    } else if (baseName === "route") {
      registerApiRoute(fullPath, appDir, routes);
    }
  }

  attachExtras(dir, entries, routes, slots, slotDefaults);
}

function registerPageRoute(fullPath: string, appDir: string, routes: Route[]): void {
  const routeDir = path.dirname(fullPath);
  const dirResult = dirToPattern(routeDir, appDir);
  const { regex, paramNames, catchAll, optionalCatchAll } = patternToRegex(dirResult.pattern, dirResult.segments);
  const layoutPaths = collectLayouts(appDir, routeDir);
  const boundaries = collectBoundaries(appDir, routeDir);
  const interceptInfo = detectInterceptingRoute(routeDir, appDir);

  const route: Route = {
    pattern: dirResult.pattern, regex, paramNames, filePath: fullPath, layoutPaths,
    type: "page", catchAll: catchAll || undefined, optionalCatchAll: optionalCatchAll || undefined,
    ...boundaries,
  };
  if (interceptInfo) {
    route.interceptDepth = interceptInfo.depth;
    route.interceptTarget = interceptInfo.targetPattern;
  }
  routes.push(route);
}

function registerApiRoute(fullPath: string, appDir: string, routes: Route[]): void {
  const routeDir = path.dirname(fullPath);
  const dirResult = dirToPattern(routeDir, appDir);
  const { regex, paramNames, catchAll, optionalCatchAll } = patternToRegex(dirResult.pattern, dirResult.segments);
  routes.push({
    pattern: dirResult.pattern, regex, paramNames, filePath: fullPath, layoutPaths: [],
    type: "api", catchAll: catchAll || undefined, optionalCatchAll: optionalCatchAll || undefined,
  });
}

function attachExtras(
  dir: string,
  entries: fs.Dirent[],
  routes: Route[],
  slots: Record<string, string>,
  slotDefaults: Record<string, string>,
): void {
  const islands: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const islandMatch = ISLAND_FILE.exec(entry.name);
    if (islandMatch) islands[islandMatch[1]] = path.join(dir, entry.name);
  }

  const hasSlots = Object.keys(slots).length > 0;
  const hasDefaults = Object.keys(slotDefaults).length > 0;
  const hasIslands = Object.keys(islands).length > 0;
  if (hasSlots || hasDefaults || hasIslands) {
    for (const route of routes) {
      if (path.dirname(route.filePath) === dir && route.type === "page") {
        if (hasSlots) route.slots = slots;
        if (hasDefaults) route.slotDefaults = slotDefaults;
        if (hasIslands) route.islands = islands;
      }
    }
  }
}

function routeWeight(route: Route): number {
  if (route.pattern === "/") return -1;
  if (route.optionalCatchAll) return 200 + route.pattern.split("/").length;
  if (route.catchAll) return 100 + route.pattern.split("/").length;
  const segs = route.pattern.split("/").filter(Boolean);
  let weight = 0;
  for (const seg of segs) { weight += seg.startsWith(":") ? 1 : 0; }
  return weight;
}
