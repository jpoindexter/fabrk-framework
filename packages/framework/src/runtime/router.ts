/**
 * Router — route matching and request dispatch.
 * Re-exports scanner and pattern utilities so existing imports from "./router" keep working.
 */

export type { Route, RouteMatch, SegmentInfo } from "./router-types";
import type { Route, RouteMatch } from "./router-types";
import { stripTrailingSlashes } from "./server-helpers";

// Re-export scanner functions
export { scanRoutes, findFile, collectLayouts, collectBoundaries } from "./route-scanner";

// Re-export pattern functions
export { dirToPattern, patternToRegex, detectInterceptingRoute } from "./route-pattern";

/**
 * Match a pathname against the sorted route list.
 * Intercepting routes are preferred during soft navigation;
 * during hard navigation the first non-intercepting match wins
 * (intercepting routes act as fallback).
 */
export function matchRoute(
  routes: Route[],
  pathname: string,
  softNavigation = false,
): RouteMatch | null {
  const normalized = pathname === "/" ? "/" : stripTrailingSlashes(pathname);
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
