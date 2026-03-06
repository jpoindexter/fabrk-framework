/**
 * URL pattern matching: convert directory structures to URL patterns and regex.
 */

import path from "node:path";
import type { SegmentInfo } from "./router-types";

/** Regex for `@slotName` parallel route directories. */
export const PARALLEL_SLOT_SEG = /^@(\w+)$/;
/** Regex for intercepting route prefixes: (.), (..), (..)(..), (...) */
export const INTERCEPT_PREFIX = /^(\(\.+\))+/;

const DYNAMIC_SEG = /^\[([^[\].]+)\]$/;
const CATCH_ALL_SEG = /^\[\.\.\.([^[\].]+)\]$/;
const OPTIONAL_CATCH_ALL_SEG = /^\[\[\.\.\.([^[\].]+)\]\]$/;
const ROUTE_GROUP_SEG = /^\(([^)]+)\)$/;

function classifySegment(seg: string): SegmentInfo {
  if (PARALLEL_SLOT_SEG.test(seg)) return { urlSegment: "", type: "group" };
  const interceptMatch = INTERCEPT_PREFIX.exec(seg);
  if (interceptMatch) {
    const realName = seg.slice(interceptMatch[0].length);
    if (realName) return { urlSegment: realName, type: "static" };
  }
  if (ROUTE_GROUP_SEG.test(seg)) return { urlSegment: "", type: "group" };
  const optCatchAll = OPTIONAL_CATCH_ALL_SEG.exec(seg);
  if (optCatchAll) return { urlSegment: `:${optCatchAll[1]}`, type: "optionalCatchAll", paramName: optCatchAll[1] };
  const catchAll = CATCH_ALL_SEG.exec(seg);
  if (catchAll) return { urlSegment: `:${catchAll[1]}`, type: "catchAll", paramName: catchAll[1] };
  const dynamic = DYNAMIC_SEG.exec(seg);
  if (dynamic) return { urlSegment: `:${dynamic[1]}`, type: "dynamic", paramName: dynamic[1] };
  return { urlSegment: seg, type: "static" };
}

export function dirToPattern(dir: string, appDir: string): { pattern: string; segments: SegmentInfo[] } {
  const relative = path.relative(appDir, dir);
  if (!relative) return { pattern: "/", segments: [] };
  const segments = relative.split(path.sep).map(classifySegment);
  const urlParts = segments.filter((s) => s.type !== "group").map((s) => s.urlSegment).filter(Boolean);
  const pattern = urlParts.length === 0 ? "/" : `/${urlParts.join("/")}`;
  return { pattern, segments };
}

export function patternToRegex(
  pattern: string,
  segments: SegmentInfo[]
): { regex: RegExp; paramNames: string[]; catchAll: boolean; optionalCatchAll: boolean } {
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

  return { regex: new RegExp(`^${regexParts.join("")}$`), paramNames, catchAll, optionalCatchAll };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Detect intercepting route conventions: (.), (..), (..)(..), (...) */
export function detectInterceptingRoute(
  routeDir: string,
  appDir: string,
): { depth: number; targetPattern: string } | null {
  const relative = path.relative(appDir, routeDir);
  if (!relative) return null;
  for (const seg of relative.split(path.sep)) {
    const match = INTERCEPT_PREFIX.exec(seg);
    if (!match) continue;
    const prefix = match[0];
    const targetName = seg.slice(prefix.length);
    if (!targetName) continue;
    if (prefix === "(...)") return { depth: -1, targetPattern: `/${targetName}` };
    const dotDotCount = (prefix.match(/\(\.\.\)/g) || []).length;
    if (dotDotCount > 0) return { depth: dotDotCount, targetPattern: targetName };
    if (prefix === "(.)") return { depth: 0, targetPattern: targetName };
  }
  return null;
}
