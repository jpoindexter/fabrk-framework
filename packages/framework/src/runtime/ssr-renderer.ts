/**
 * SSR rendering: React element to HTML (streaming + string), error handling.
 */

import type { ViteDevServer } from "vite";
import type { RouteMatch } from "./router-types";
import type { Metadata } from "./metadata";
import type { PageModules } from "./page-builder";
import { buildMetadataHtml } from "./metadata";
import { buildPageTree } from "./page-builder";
import { buildSecurityHeaders } from "../middleware/security";
import { isRedirectError, isNotFoundError } from "./server-helpers";
import { sanitizeRedirectUrl } from "./ssr-sanitize";
import { streamingRender, buildDevHtml } from "./ssr-html";
import fs from "node:fs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactModuleLoader = () => Promise<[any, any]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildElement(React: any, matched: RouteMatch, modules: PageModules, pageProps: Record<string, unknown>, layouts: Array<React.ComponentType<{ children: React.ReactNode }>>, url?: URL): React.ReactElement {
  const createElement = React.createElement ?? React.default?.createElement;
  const hasBoundaries = modules.errorFallback || modules.loadingFallback || modules.notFoundFallback || modules.globalErrorFallback;
  if (hasBoundaries) {
    return buildPageTree({
      route: matched.route, params: matched.params,
      searchParams: pageProps.searchParams as Record<string, string>,
      modules, pathname: url?.pathname ?? "/", React,
    });
  }
  let element = createElement(modules.page, pageProps);
  for (let i = layouts.length - 1; i >= 0; i--) {
    element = createElement(layouts[i], { children: element });
  }
  return element;
}

function htmlResponse(html: string, routeHeaders: Record<string, string>): Response {
  return new Response(html, {
    status: 200,
    headers: { ...routeHeaders, "Content-Type": "text/html; charset=utf-8", ...buildSecurityHeaders() },
  });
}

export async function renderPage(
  matched: RouteMatch, modules: PageModules, pageProps: Record<string, unknown>,
  layouts: Array<React.ComponentType<{ children: React.ReactNode }>>,
  metadata: Metadata, routeHeaders: Record<string, string>,
  viteServer: ViteDevServer, htmlShell: (options: { head: string; body: string }) => string,
  reactLoader?: ReactModuleLoader, url?: URL,
): Promise<Response> {
  const loader = reactLoader ?? defaultReactLoader;
  const [reactDomServer, React] = await loader();
  const createElement = React.createElement ?? React.default?.createElement;
  if (typeof createElement !== "function") {
    return new Response("React not available", {
      status: 500, headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  }
  const element = buildElement(React, matched, modules, pageProps, layouts, url);
  const renderToReadableStream = reactDomServer.renderToReadableStream ?? reactDomServer.default?.renderToReadableStream;
  const renderToString = reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

  const indexHtmlPath = path.join(viteServer.config.root, "index.html");
  if (fs.existsSync(indexHtmlPath) && typeof renderToString === "function") {
    const ssrBody = renderToString(element);
    const html = await buildDevHtml(viteServer, matched, metadata, ssrBody, htmlShell);
    return htmlResponse(html, routeHeaders);
  }
  if (typeof renderToReadableStream === "function") {
    return streamingRender(element, renderToReadableStream, metadata, htmlShell, routeHeaders, matched.route.ppr);
  }
  if (typeof renderToString === "function") {
    return htmlResponse(htmlShell({ head: buildMetadataHtml(metadata), body: renderToString(element) }), routeHeaders);
  }
  console.error("[fabrk] No React SSR render function available");
  return new Response("React SSR modules not available", {
    status: 500, headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
  });
}

export function handlePageError(err: unknown): Response {
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
  console.error("[fabrk] SSR render error:", err);
  return new Response("Internal server error", {
    status: 500,
    headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function defaultReactLoader(): Promise<[any, any]> {
  const [rdServer, react] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);
  return [rdServer, react];
}
