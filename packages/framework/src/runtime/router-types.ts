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
  /** Enable Partial Pre-Rendering — static shell + streamed dynamic holes. */
  ppr?: boolean;
  /** Server island components — maps island name to file path. */
  islands?: Record<string, string>;
  /** Edge or Node.js runtime for this route. */
  runtime?: "node" | "edge";
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export interface SegmentInfo {
  urlSegment: string;
  type: "static" | "dynamic" | "catchAll" | "optionalCatchAll" | "group";
  paramName?: string;
}
