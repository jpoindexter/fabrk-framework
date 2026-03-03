import fs from "node:fs";
import path from "node:path";

export interface Route {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  filePath: string;
  layoutPaths: string[];
  type: "page" | "api";
  /** Path to the nearest error.tsx boundary (if any). */
  errorPath?: string;
  /** Path to the nearest loading.tsx boundary (if any). */
  loadingPath?: string;
  /** Path to the nearest not-found.tsx boundary (if any). */
  notFoundPath?: string;
  /** True for `[...slug]` catch-all routes. */
  catchAll?: boolean;
  /** True for `[[...slug]]` optional catch-all routes. */
  optionalCatchAll?: boolean;
  /** Parallel route slots — maps slot name to page file path. */
  slots?: Record<string, string>;
  /** Default slot fallbacks — maps slot name to default.tsx file path. */
  slotDefaults?: Record<string, string>;
  /** Intercepting route depth (0 = same level, 1 = parent, etc., -1 = root). */
  interceptDepth?: number;
  /** For intercepting routes, the original (non-intercepted) route pattern. */
  interceptTarget?: string;
}

/** Regex for `@slotName` parallel route directories. */
const PARALLEL_SLOT_SEG = /^@(\w+)$/;
/** Regex for intercepting route prefixes: (.), (..), (..)(..), (...) */
const INTERCEPT_PREFIX = /^(\(\.+\))+/;

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export function scanRoutes(appDir: string): Route[] {
  if (!fs.existsSync(appDir)) return [];

  const routes: Route[] = [];
  walkDir(appDir, appDir, routes);

  routes.sort((a, b) => routeWeight(a) - routeWeight(b));

  return routes;
}

export function matchRoute(
  routes: Route[],
  pathname: string,
  softNavigation = false,
): RouteMatch | null {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  let fallback: RouteMatch | null = null;

  for (const route of routes) {
    const match = route.regex.exec(normalized);
    if (!match) continue;

    const params: Record<string, string> = {};
    for (let i = 0; i < route.paramNames.length; i++) {
      const value = match[i + 1];
      if (value !== undefined) params[route.paramNames[i]] = value;
    }

    const isIntercepting = route.interceptDepth !== undefined;

    if (softNavigation && isIntercepting) return { route, params };
    if (!softNavigation && isIntercepting) {
      if (!fallback) fallback = { route, params };
      continue;
    }

    return { route, params };
  }

  return fallback;
}

export function collectLayouts(
  appDir: string,
  routeDir: string
): string[] {
  const layouts: string[] = [];
  const normalizedAppDir = path.resolve(appDir);
  let current = path.resolve(routeDir);

  const segments: string[] = [];
  while (current.length >= normalizedAppDir.length) {
    segments.unshift(current);
    if (current === normalizedAppDir) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  for (const dir of segments) {
    const layoutPath = findFile(dir, "layout");
    if (layoutPath) {
      layouts.push(layoutPath);
    }
  }

  return layouts;
}

/**
 * Walk from a route directory up to appDir and collect the nearest
 * error.tsx, loading.tsx, and not-found.tsx boundaries.
 * Returns the first match found (closest to the route).
 */
export function collectBoundaries(
  appDir: string,
  routeDir: string
): { errorPath?: string; loadingPath?: string; notFoundPath?: string } {
  const normalizedAppDir = path.resolve(appDir);
  let current = path.resolve(routeDir);
  let errorPath: string | undefined;
  let loadingPath: string | undefined;
  let notFoundPath: string | undefined;

  while (current.length >= normalizedAppDir.length) {
    if (!errorPath) {
      const found = findFile(current, "error");
      if (found) errorPath = found;
    }
    if (!loadingPath) {
      const found = findFile(current, "loading");
      if (found) loadingPath = found;
    }
    if (!notFoundPath) {
      const found = findFile(current, "not-found");
      if (found) notFoundPath = found;
    }

    if (errorPath && loadingPath && notFoundPath) break;
    if (current === normalizedAppDir) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return { errorPath, loadingPath, notFoundPath };
}

const PAGE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

const DYNAMIC_SEG = /^\[([^[\].]+)\]$/;
const CATCH_ALL_SEG = /^\[\.\.\.([^[\].]+)\]$/;
const OPTIONAL_CATCH_ALL_SEG = /^\[\[\.\.\.([^[\].]+)\]\]$/;
const ROUTE_GROUP_SEG = /^\(([^)]+)\)$/;

function walkDir(dir: string, appDir: string, routes: Route[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const slots: Record<string, string> = {};
  const slotDefaults: Record<string, string> = {};

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

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
      const routeDir = path.dirname(fullPath);
      const dirResult = dirToPattern(routeDir, appDir);
      const { regex, paramNames, catchAll, optionalCatchAll } = patternToRegex(
        dirResult.pattern,
        dirResult.segments
      );
      const layoutPaths = collectLayouts(appDir, routeDir);
      const boundaries = collectBoundaries(appDir, routeDir);

      const interceptInfo = detectInterceptingRoute(routeDir, appDir);

      const route: Route = {
        pattern: dirResult.pattern,
        regex,
        paramNames,
        filePath: fullPath,
        layoutPaths,
        type: "page",
        catchAll: catchAll || undefined,
        optionalCatchAll: optionalCatchAll || undefined,
        ...boundaries,
      };

      if (interceptInfo) {
        route.interceptDepth = interceptInfo.depth;
        route.interceptTarget = interceptInfo.targetPattern;
      }

      routes.push(route);
    } else if (baseName === "route") {
      const routeDir = path.dirname(fullPath);
      const dirResult = dirToPattern(routeDir, appDir);
      const { regex, paramNames, catchAll, optionalCatchAll } = patternToRegex(
        dirResult.pattern,
        dirResult.segments
      );

      routes.push({
        pattern: dirResult.pattern,
        regex,
        paramNames,
        filePath: fullPath,
        layoutPaths: [],
        type: "api",
        catchAll: catchAll || undefined,
        optionalCatchAll: optionalCatchAll || undefined,
      });
    }
  }

  if (Object.keys(slots).length > 0 || Object.keys(slotDefaults).length > 0) {
    for (const route of routes) {
      if (path.dirname(route.filePath) === dir && route.type === "page") {
        if (Object.keys(slots).length > 0) route.slots = slots;
        if (Object.keys(slotDefaults).length > 0) route.slotDefaults = slotDefaults;
      }
    }
  }
}

export function findFile(dir: string, baseName: string): string | null {
  for (const ext of PAGE_EXTENSIONS) {
    const filePath = path.join(dir, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

interface SegmentInfo {
  urlSegment: string;
  type: "static" | "dynamic" | "catchAll" | "optionalCatchAll" | "group";
  paramName?: string;
}

function dirToPattern(
  dir: string,
  appDir: string
): { pattern: string; segments: SegmentInfo[] } {
  const relative = path.relative(appDir, dir);
  if (!relative) return { pattern: "/", segments: [] };

  const rawSegments = relative.split(path.sep);
  const segments: SegmentInfo[] = [];

  for (const seg of rawSegments) {
    if (PARALLEL_SLOT_SEG.test(seg)) {
      segments.push({ urlSegment: "", type: "group" });
      continue;
    }

    const interceptMatch = INTERCEPT_PREFIX.exec(seg);
    if (interceptMatch) {
      const realName = seg.slice(interceptMatch[0].length);
      if (realName) {
        segments.push({ urlSegment: realName, type: "static" });
        continue;
      }
    }

    if (ROUTE_GROUP_SEG.test(seg)) {
      segments.push({ urlSegment: "", type: "group" });
      continue;
    }

    const optCatchAll = OPTIONAL_CATCH_ALL_SEG.exec(seg);
    if (optCatchAll) {
      segments.push({
        urlSegment: `:${optCatchAll[1]}`,
        type: "optionalCatchAll",
        paramName: optCatchAll[1],
      });
      continue;
    }

    const catchAll = CATCH_ALL_SEG.exec(seg);
    if (catchAll) {
      segments.push({
        urlSegment: `:${catchAll[1]}`,
        type: "catchAll",
        paramName: catchAll[1],
      });
      continue;
    }

    const dynamic = DYNAMIC_SEG.exec(seg);
    if (dynamic) {
      segments.push({
        urlSegment: `:${dynamic[1]}`,
        type: "dynamic",
        paramName: dynamic[1],
      });
      continue;
    }

    segments.push({ urlSegment: seg, type: "static" });
  }

  const urlParts = segments
    .filter((s) => s.type !== "group")
    .map((s) => s.urlSegment)
    .filter(Boolean);

  const pattern = urlParts.length === 0 ? "/" : `/${urlParts.join("/")}`;

  return { pattern, segments };
}

function patternToRegex(
  pattern: string,
  segments: SegmentInfo[]
): {
  regex: RegExp;
  paramNames: string[];
  catchAll: boolean;
  optionalCatchAll: boolean;
} {
  const paramNames: string[] = [];
  let catchAll = false;
  let optionalCatchAll = false;

  if (pattern === "/" && segments.every((s) => s.type === "group")) {
    return { regex: /^\/$/, paramNames, catchAll, optionalCatchAll };
  }

  const urlSegments = segments.filter((s) => s.type !== "group");

  if (urlSegments.length === 0) {
    return { regex: /^\/$/, paramNames, catchAll, optionalCatchAll };
  }

  const regexParts: string[] = [];

  for (const seg of urlSegments) {
    switch (seg.type) {
      case "optionalCatchAll":
        if (seg.paramName) paramNames.push(seg.paramName);
        optionalCatchAll = true;
        regexParts.push("(?:/(.*))?");
        break;

      case "catchAll":
        if (seg.paramName) paramNames.push(seg.paramName);
        catchAll = true;
        regexParts.push("/(.+)");
        break;

      case "dynamic":
        if (seg.paramName) paramNames.push(seg.paramName);
        regexParts.push("/([^/]+)");
        break;

      case "static":
        regexParts.push(`/${escapeRegex(seg.urlSegment)}`);
        break;
    }
  }

  const regexStr = regexParts.join("");
  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
    catchAll,
    optionalCatchAll,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sort weight for route matching priority.
 * Lower weight = higher priority = matched first.
 *
 * Priority order:
 * 1. Root "/" (weight -1)
 * 2. Pure static routes (weight 0)
 * 3. Routes with dynamic segments (weight increases per dynamic seg)
 * 4. Catch-all routes (weight 100)
 * 5. Optional catch-all routes (weight 200)
 *
 * Within same category, fewer segments = more specific = higher priority.
 */
function routeWeight(route: Route): number {
  if (route.pattern === "/") return -1;

  if (route.optionalCatchAll) return 200 + route.pattern.split("/").length;
  if (route.catchAll) return 100 + route.pattern.split("/").length;

  const segs = route.pattern.split("/").filter(Boolean);
  let weight = 0;
  for (const seg of segs) {
    weight += seg.startsWith(":") ? 1 : 0;
  }
  return weight;
}

/**
 * Detect if a route directory uses intercepting route conventions.
 * Checks all segments in the path from appDir to routeDir.
 *
 * Conventions:
 * - `(.)routeName` — intercept from same level (depth 0)
 * - `(..)routeName` — intercept from parent level (depth 1)
 * - `(..)(..)routeName` — intercept from grandparent (depth 2)
 * - `(...)routeName` — intercept from root (depth -1)
 */
function detectInterceptingRoute(
  routeDir: string,
  appDir: string,
): { depth: number; targetPattern: string } | null {
  const relative = path.relative(appDir, routeDir);
  if (!relative) return null;

  const segments = relative.split(path.sep);

  for (const seg of segments) {
    const match = INTERCEPT_PREFIX.exec(seg);
    if (!match) continue;

    const prefix = match[0];
    const targetName = seg.slice(prefix.length);
    if (!targetName) continue;

    if (prefix === "(...)") {
      return { depth: -1, targetPattern: `/${targetName}` };
    }

    const dotDotCount = (prefix.match(/\(\.\.\)/g) || []).length;
    if (dotDotCount > 0) {
      return { depth: dotDotCount, targetPattern: targetName };
    }

    if (prefix === "(.)") {
      return { depth: 0, targetPattern: targetName };
    }
  }

  return null;
}
