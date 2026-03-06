/** SSR request handler — main entry point. */

import type { ViteDevServer } from "vite";
import type { Route } from "./router-types";
import { matchRoute } from "./router";
import { buildSecurityHeaders } from "../middleware/security";
import { extractLocale, type I18nConfig } from "./i18n";
import { startSpan } from "./tracer";
import { runWithContext } from "./server-context";
import { rewriteUrl } from "./ssr-sanitize";
import { handlePageRoute, type ReactModuleLoader } from "./ssr-page-loader";

export interface SSRHandlerOptions {
  routes: Route[];
  viteServer: ViteDevServer;
  htmlShell?: (options: { head: string; body: string }) => string;
  middlewarePath?: string;
  appDir?: string;
  i18n?: I18nConfig;
  _reactLoader?: ReactModuleLoader;
}

const DEFAULT_HTML_SHELL = ({ head, body }: { head: string; body: string }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head}
</head>
<body>
  <div id="root">${body}</div>
</body>
</html>`;

export async function handleRequest(
  request: Request,
  options: SSRHandlerOptions
): Promise<Response> {
  const { routes, viteServer, htmlShell = DEFAULT_HTML_SHELL, middlewarePath, appDir, i18n } = options;
  let mwResponseHeaders: Headers | undefined;
  if (middlewarePath) {
    const result = await runMiddleware(request, viteServer, middlewarePath);
    if (result instanceof Response) return result;
    if (result) {
      if (result.request) request = result.request;
      mwResponseHeaders = result.headers;
    }
  }

  const url = new URL(request.url);
  let pathname = url.pathname;
  let locale: string | undefined;
  if (i18n) {
    const extracted = extractLocale(pathname, i18n);
    locale = extracted.locale;
    pathname = extracted.pathname;
  }

  const isSoftNav = request.headers.get("x-fabrk-navigation") === "soft";
  const matched = matchRoute(routes, pathname, isSoftNav);

  if (!matched) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  }

  if (matched.route.type === "api") {
    return handleApiRoute(request, matched, viteServer);
  }

  const response = await runWithContext(request, () =>
    startSpan("fabrk.ssr.request", () =>
      handlePageRoute(request, matched, viteServer, htmlShell, options._reactLoader, appDir, locale)
    )
  );

  if (mwResponseHeaders) mwResponseHeaders.forEach((v, k) => { response.headers.set(k, v); });
  return response;
}

async function runMiddleware(
  request: Request,
  viteServer: ViteDevServer,
  middlewarePath: string,
): Promise<Response | { request?: Request; headers?: Headers } | null> {
  try {
    const middlewareMod = await viteServer.ssrLoadModule(middlewarePath);
    const middleware = middlewareMod.default;
    if (typeof middleware !== "function") return null;
    const middlewareResult = await middleware(request);
    if (middlewareResult instanceof Response) return middlewareResult;
    if (middlewareResult && typeof middlewareResult === "object") {
      let updatedRequest: Request | undefined;
      if (typeof middlewareResult.rewriteUrl === "string") {
        const safeRewrite = rewriteUrl(middlewareResult.rewriteUrl);
        if (safeRewrite) {
          updatedRequest = new Request(new URL(safeRewrite, request.url).toString(), request);
        }
      }
      const headers = middlewareResult.responseHeaders instanceof Headers
        ? middlewareResult.responseHeaders
        : undefined;
      return { request: updatedRequest, headers };
    }
    return null;
  } catch (err) {
    console.error("[fabrk] Middleware error:", err);
    return new Response("Internal server error", {
      status: 500,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  }
}

function apiJsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

async function handleApiRoute(
  request: Request,
  matched: { route: Route; params: Record<string, string> },
  viteServer: ViteDevServer
): Promise<Response> {
  const method = request.method.toUpperCase();
  let mod: Record<string, unknown>;
  try {
    mod = await viteServer.ssrLoadModule(matched.route.filePath);
  } catch (err) {
    console.error("[fabrk] Failed to load API route:", err);
    return apiJsonError("Internal server error", 500);
  }

  const handler = mod[method] ?? mod[method.toLowerCase()];
  if (typeof handler !== "function") {
    return apiJsonError(`Method ${method} not allowed`, 405);
  }

  try {
    return await handler(request, { params: matched.params });
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return apiJsonError("Internal server error", 500);
  }
}
