import type React from "react";
import type { Route } from "./router";
import { buildSecurityHeaders } from "../middleware/security";
import { resolveMetadata, mergeMetadata, buildMetadataHtml } from "./metadata";
import { buildPageTree, type PageModules } from "./page-builder";
import { jsonError, textError } from "./worker-renderer";
export async function handleWorkerPageRoute(
  request: Request,
  matched: { route: Route; params: Record<string, string> },
  modules?: Map<string, Record<string, unknown>>,
  layoutModules?: Map<string, Record<string, unknown>>
): Promise<Response> {
  const mod = modules?.get(matched.route.filePath);
  if (!mod) return jsonError("Route module not available", 501);
  if (typeof mod.default !== "function") return textError("Page component must export a default function", 500);

  try {
    const [reactDomServer, React] = await Promise.all([import("react-dom/server"), import("react")]);
    const createElement = React.createElement ?? React.default?.createElement;
    if (typeof createElement !== "function") return textError("React not available in worker environment", 500);

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const { head, layouts } = await resolveLayoutChain(matched, layoutModules, { params: matched.params, searchParams });
    const pageModules = buildWorkerPageModules(mod, matched, modules, layouts);
    const element = buildElement(pageModules, matched, searchParams, url, React, createElement);

    return renderToResponse(element, head, reactDomServer);
  } catch (err) {
    console.error("[fabrk] Page render error:", err);
    return textError("Internal server error", 500);
  }
}

async function resolveLayoutChain(
  matched: { route: Route; params: Record<string, string> },
  layoutModules: Map<string, Record<string, unknown>> | undefined,
  metadataContext: { params: Record<string, string>; searchParams: Record<string, string> },
): Promise<{ head: string; layouts: Array<React.ComponentType<{ children: React.ReactNode }>> }> {
  const metadataLayers = [];
  const layouts: Array<React.ComponentType<{ children: React.ReactNode }>> = [];
  if (layoutModules) {
    for (const lp of matched.route.layoutPaths) {
      const layoutMod = layoutModules.get(lp);
      if (layoutMod) {
        metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
        if (typeof layoutMod.default === "function") {
          layouts.push(layoutMod.default as React.ComponentType<{ children: React.ReactNode }>);
        }
      }
    }
  }
  const mod = await import(matched.route.filePath).catch(() => null);
  if (mod) metadataLayers.push(await resolveMetadata(mod, metadataContext));
  return { head: buildMetadataHtml(mergeMetadata(metadataLayers)), layouts };
}

function buildWorkerPageModules(
  mod: Record<string, unknown>,
  matched: { route: Route; params: Record<string, string> },
  modules: Map<string, Record<string, unknown>> | undefined,
  layouts: Array<React.ComponentType<{ children: React.ReactNode }>>,
): PageModules {
  const pageModules: PageModules = { page: mod.default as PageModules["page"], layouts };

  if (matched.route.errorPath && modules) {
    const m = modules.get(matched.route.errorPath);
    if (m && typeof m.default === "function") pageModules.errorFallback = m.default as PageModules["errorFallback"];
  }
  if (matched.route.loadingPath && modules) {
    const m = modules.get(matched.route.loadingPath);
    if (m && typeof m.default === "function") pageModules.loadingFallback = m.default as PageModules["loadingFallback"];
  }
  if (matched.route.notFoundPath && modules) {
    const m = modules.get(matched.route.notFoundPath);
    if (m && typeof m.default === "function") pageModules.notFoundFallback = m.default as PageModules["notFoundFallback"];
  }

  return pageModules;
}

function buildElement(
  pageModules: PageModules,
  matched: { route: Route; params: Record<string, string> },
  searchParams: Record<string, string>,
  url: URL,
  React: typeof import("react"),
  createElement: typeof import("react").createElement,
): React.ReactNode {
  if (pageModules.errorFallback || pageModules.loadingFallback || pageModules.notFoundFallback) {
    return buildPageTree({ route: matched.route, params: matched.params, searchParams, modules: pageModules, pathname: url.pathname, React });
  }

  let element: React.ReactNode = createElement(
    pageModules.page as React.FC<Record<string, unknown>>,
    { params: matched.params, searchParams }
  );
  for (let i = pageModules.layouts.length - 1; i >= 0; i--) {
    element = createElement(pageModules.layouts[i], { children: element });
  }
  return element;
}

function renderToResponse(
  element: React.ReactNode,
  head: string,
  reactDomServer: typeof import("react-dom/server"),
): Response {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import may have .default wrapper
  const mod = reactDomServer as any;
  const renderToReadableStream = mod.renderToReadableStream ?? mod.default?.renderToReadableStream;
  const renderToString = mod.renderToString ?? mod.default?.renderToString;

  if (typeof renderToReadableStream === "function") return streamToResponse(element, head, renderToReadableStream);

  if (typeof renderToString === "function") {
    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  ${head}\n</head>\n<body>\n  <div id="root">${renderToString(element)}</div>\n</body>\n</html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...buildSecurityHeaders() } });
  }

  return textError("React SSR not available in worker", 500);
}

function streamToResponse(
  element: React.ReactNode,
  head: string,
  renderFn: (el: React.ReactNode) => Promise<ReadableStream>,
): Response {
  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();
  const prefix = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  ${head}\n</head>\n<body>\n  <div id="root">`;
  const suffix = `</div>\n</body>\n</html>`;
  renderFn(element).then(async (stream) => {
    const writer = writable.getWriter();
    await writer.write(encoder.encode(prefix));
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
    await writer.write(encoder.encode(suffix));
    await writer.close();
  }).catch(() => writable.close());

  return new Response(readable, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...buildSecurityHeaders() },
  });
}
