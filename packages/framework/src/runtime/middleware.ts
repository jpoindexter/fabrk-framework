import { buildSecurityHeaders } from "../middleware/security";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MiddlewareResult {
  /** If false, the response is returned directly (short-circuit). */
  continue: boolean;
  /** Redirect the request to a different URL. */
  redirectUrl?: string;
  /** Rewrite the request to a different internal path. */
  rewriteUrl?: string;
  /** Extra headers to add to the final response. */
  responseHeaders?: Headers;
  /** A complete Response to return (overrides all other fields). */
  response?: Response;
}

export interface MiddlewareConfig {
  /** URL patterns the middleware applies to. Unmatched requests skip it. */
  matcher?: string[];
}

export type MiddlewareHandler = (
  request: Request,
) => Promise<Response | MiddlewareResult | null | void>;

// ---------------------------------------------------------------------------
// Matcher compilation
// ---------------------------------------------------------------------------

/**
 * Compile a matcher pattern to a RegExp.
 *
 * Supported syntax:
 * - `/dashboard` — exact prefix match
 * - `/api/:path*` — wildcard segment (matches rest of path)
 * - `/blog/:slug` — single dynamic segment
 *
 * Rejects patterns with nested quantifiers (ReDoS protection).
 */
export function compileMatcher(pattern: string): RegExp {
  if (hasNestedQuantifiers(pattern)) {
    throw new Error(
      `[fabrk] Middleware matcher pattern rejected (ReDoS risk): ${pattern}`,
    );
  }

  // Normalize: remove trailing slash (except root)
  let normalized = pattern === "/" ? "/" : pattern.replace(/\/+$/, "");

  // Replace :param* with (.+) for wildcard
  normalized = normalized.replace(/:[\w]+\*/g, "(.+)");
  // Replace :param with ([^/]+) for single segment
  normalized = normalized.replace(/:[\w]+/g, "([^/]+)");

  // Anchor to start, allow trailing slash
  return new RegExp(`^${normalized}(?:\\/)?$`);
}

/**
 * Check if a pathname matches any of the compiled matchers.
 * If no matchers provided, matches all paths.
 */
export function matchesMiddleware(
  pathname: string,
  matchers: RegExp[] | undefined,
): boolean {
  if (!matchers || matchers.length === 0) return true;
  return matchers.some((re) => re.test(pathname));
}

// ---------------------------------------------------------------------------
// ReDoS protection
// ---------------------------------------------------------------------------

/**
 * Detect patterns that could cause catastrophic backtracking:
 * - Adjacent quantifiers: `a**`, `a+*`, `a?+`
 * - Quantified groups containing quantifiers: `(a+)+`, `(a*)*`
 */
function hasNestedQuantifiers(pattern: string): boolean {
  // Direct adjacent quantifiers
  if (/[+*?}]\s*[+*?{]/.test(pattern)) return true;
  // Quantifier after closing paren of a group that contains a quantifier
  if (/\([^)]*[+*?]\)[+*?{]/.test(pattern)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Middleware runner
// ---------------------------------------------------------------------------

/**
 * Run a middleware handler and normalize the result into a Response or null.
 *
 * - `null` / `undefined` / `{ continue: true }` → continue to route handler
 * - `Response` → return directly
 * - `{ redirectUrl }` → 307 redirect
 * - `{ rewriteUrl }` → modify request URL (caller handles)
 * - `{ response }` → return the custom response
 */
export async function runMiddleware(
  request: Request,
  handler: MiddlewareHandler,
  matchers?: RegExp[],
): Promise<{
  response: Response | null;
  rewriteUrl?: string;
  responseHeaders?: Headers;
}> {
  const url = new URL(request.url);

  if (!matchesMiddleware(url.pathname, matchers)) {
    return { response: null };
  }

  const result = await handler(request);

  // null/undefined → continue
  if (result == null) {
    return { response: null };
  }

  // Direct Response
  if (result instanceof Response) {
    return { response: result };
  }

  // MiddlewareResult object
  if (result.response) {
    return { response: result.response, responseHeaders: result.responseHeaders };
  }

  if (result.redirectUrl) {
    return {
      response: new Response(null, {
        status: 307,
        headers: {
          Location: result.redirectUrl,
          ...buildSecurityHeaders(),
        },
      }),
    };
  }

  if (result.rewriteUrl) {
    return {
      response: null,
      rewriteUrl: result.rewriteUrl,
      responseHeaders: result.responseHeaders,
    };
  }

  if (!result.continue) {
    // Short-circuit with empty 200
    return {
      response: new Response(null, {
        status: 200,
        headers: buildSecurityHeaders(),
      }),
    };
  }

  return {
    response: null,
    responseHeaders: result.responseHeaders,
  };
}

// ---------------------------------------------------------------------------
// Middleware module loader
// ---------------------------------------------------------------------------

export interface MiddlewareModule {
  default: MiddlewareHandler;
  config?: MiddlewareConfig;
}

/**
 * Extract handler and compiled matchers from a loaded middleware module.
 */
export function extractMiddleware(mod: MiddlewareModule): {
  handler: MiddlewareHandler;
  matchers: RegExp[] | undefined;
} {
  const handler = mod.default;
  if (typeof handler !== "function") {
    throw new Error("[fabrk] Middleware must export a default function");
  }

  const matchers = mod.config?.matcher?.map(compileMatcher);
  return { handler, matchers };
}
