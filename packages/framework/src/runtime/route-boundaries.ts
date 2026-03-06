/**
 * Layout and boundary file collection: walk from a route directory up
 * to appDir collecting layout.tsx, error.tsx, loading.tsx, not-found.tsx.
 */

import path from "node:path";
import { findFile } from "./route-scanner";

export function collectLayouts(appDir: string, routeDir: string): string[] {
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
    if (layoutPath) layouts.push(layoutPath);
  }

  return layouts;
}

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
    if (!errorPath) { const f = findFile(current, "error"); if (f) errorPath = f; }
    if (!loadingPath) { const f = findFile(current, "loading"); if (f) loadingPath = f; }
    if (!notFoundPath) { const f = findFile(current, "not-found"); if (f) notFoundPath = f; }

    if (errorPath && loadingPath && notFoundPath) break;
    if (current === normalizedAppDir) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return { errorPath, loadingPath, notFoundPath };
}
