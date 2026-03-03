import type { Route } from "./router";

const DYNAMIC_SEG = /\[([^\[\]\.]+)\]/g;
const CATCH_ALL_SEG = /\[\.\.\.([^\[\]\.]+)\]/g;
const OPTIONAL_CATCH_ALL_SEG = /\[\[\.\.\.([^\[\]\.]+)\]\]/g;

function extractParamType(pattern: string): string {
  const params: string[] = [];

  // Check optional catch-all first (more specific)
  let match: RegExpExecArray | null;
  const optCatchAll = new RegExp(OPTIONAL_CATCH_ALL_SEG.source, "g");
  while ((match = optCatchAll.exec(pattern)) !== null) {
    params.push(`${match[1]}?: string[]`);
  }

  const catchAll = new RegExp(CATCH_ALL_SEG.source, "g");
  while ((match = catchAll.exec(pattern)) !== null) {
    params.push(`${match[1]}: string[]`);
  }

  // Clean pattern of catch-alls before scanning dynamic segments
  const cleaned = pattern
    .replace(/\[\[\.\.\.([^\[\]\.]+)\]\]/g, "")
    .replace(/\[\.\.\.([^\[\]\.]+)\]/g, "");

  const dynamic = new RegExp(DYNAMIC_SEG.source, "g");
  while ((match = dynamic.exec(cleaned)) !== null) {
    params.push(`${match[1]}: string`);
  }

  if (params.length === 0) return "Record<string, never>";
  return `{ ${params.join("; ")} }`;
}

export function generateRouteTypes(routes: Route[]): string {
  const pageRoutes = routes.filter((r) => r.type === "page");

  if (pageRoutes.length === 0) {
    return [
      "export type RoutePattern = never;",
      "export type ExtractParams<_T extends string> = Record<string, never>;",
      "export type RouteMap = Record<string, never>;",
    ].join("\n");
  }

  const patterns = pageRoutes.map((r) => JSON.stringify(r.pattern));
  const union = patterns.join(" | ");

  const mapEntries = pageRoutes.map(
    (r) => `  ${JSON.stringify(r.pattern)}: ${extractParamType(r.pattern)};`
  );

  return [
    `export type RoutePattern = ${union};`,
    "",
    "type _DynSeg<S extends string> = S extends `${string}[[...${infer P}]]${string}`",
    "  ? { [K in P]?: string[] }",
    "  : S extends `${string}[...${infer P}]${string}`",
    "    ? { [K in P]: string[] }",
    "    : S extends `${string}[${infer P}]${infer Rest}`",
    "      ? { [K in P]: string } & _DynSeg<Rest>",
    "      : Record<string, never>;",
    "",
    "export type ExtractParams<T extends string> = _DynSeg<T>;",
    "",
    "export interface RouteMap {",
    ...mapEntries,
    "}",
  ].join("\n");
}
