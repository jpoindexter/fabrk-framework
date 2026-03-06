import { matchRoute, type Route } from "./router";
import { buildSecurityHeaders } from "../middleware/security";
import { isRedirectError, isNotFoundError } from "./server-helpers";
import { isImageRequest } from "./image-handler";
import { handleWorkerApiRoute } from "./worker-renderer";
import { handleWorkerPageRoute } from "./worker-page";

function sanitizeRedirectUrl(url: string): string {
  const stripped = url.replace(/[\r\n]/g, "");
  // Reject // prefix — protocol-relative URLs resolve to an arbitrary domain (open redirect)
  if ((stripped.startsWith("/") && !stripped.startsWith("//")) || stripped.startsWith("#")) return stripped;
  return "/";
}

export interface FetchHandlerOptions {
  routes: Route[];
  /** Pre-imported route modules, keyed by filePath. */
  modules?: Map<string, Record<string, unknown>>;
  /** Pre-imported layout modules, keyed by filePath. */
  layoutModules?: Map<string, Record<string, unknown>>;
  /** Serve static assets from platform-specific storage (R2, KV, etc). */
  getAsset?: (request: Request) => Promise<Response | null>;
  /** Optional middleware function. */
  middleware?: (request: Request) => Promise<Response | null>;
}

export function createFetchHandler(options: FetchHandlerOptions) {
  const { routes, modules, layoutModules, getAsset, middleware } = options;

  return {
    async fetch(request: Request): Promise<Response> {
      try {
        if (getAsset) {
          const assetResponse = await getAsset(request);
          if (assetResponse) return assetResponse;
        }

        if (middleware) {
          const middlewareResponse = await middleware(request);
          if (middlewareResponse) return middlewareResponse;
        }

        const url = new URL(request.url);

        if (isImageRequest(url.pathname)) {
          return new Response(
            JSON.stringify({ error: "Image optimization not available in worker mode" }),
            { status: 501, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } },
          );
        }

        const isSoftNav = request.headers.get("x-fabrk-navigation") === "soft";
        const matched = matchRoute(routes, url.pathname, isSoftNav);

        if (!matched) {
          return new Response("Not Found", {
            status: 404,
            headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
          });
        }

        if (matched.route.type === "api") {
          return handleWorkerApiRoute(request, matched, modules);
        }

        return handleWorkerPageRoute(request, matched, modules, layoutModules);
      } catch (err) {
        return handleTopLevelError(err);
      }
    },
  };
}

function handleTopLevelError(err: unknown): Response {
  if (isRedirectError(err)) {
    return new Response(null, {
      status: err.statusCode,
      headers: { Location: sanitizeRedirectUrl(err.url), ...buildSecurityHeaders() },
    });
  }

  if (isNotFoundError(err)) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  }

  console.error("[fabrk] Worker error:", err);
  return new Response("Internal server error", {
    status: 500,
    headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
  });
}

export type { Route } from "./router";
