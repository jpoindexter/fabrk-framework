import { buildSecurityHeaders } from "../middleware/security";
import {
  serveFromISR,
  getRevalidateInterval,
  getPageTags,
  type ISRCacheHandler,
} from "./isr-cache";
import type { ServerEntry } from "./route-handlers";
import { resolveHeadHtml, wrapWithLayouts, resolveRouteHeaders, buildHtmlShell } from "./page-layout";
import { renderWithReact, errorResponse } from "./page-render-react";

export async function renderPageToString(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
  cssTags: string,
  scriptTags: string,
): Promise<{ status: number; body: string }> {
  const [reactDomServer, React] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);

  const createElement = React.createElement ?? React.default?.createElement;
  const renderToString =
    reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

  if (typeof createElement !== "function" || typeof renderToString !== "function") {
    return { status: 500, body: "React SSR modules not available" };
  }

  const url = new URL(reqUrl, "http://localhost");
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const head = await resolveHeadHtml(route, serverEntry, { params, searchParams });

  let element: React.ReactNode = createElement(
    route.module.default as React.FC<Record<string, unknown>>,
    { params, searchParams }
  );
  element = wrapWithLayouts(element, route, serverEntry, createElement);

  const ssrBody = renderToString(element);
  return { status: 200, body: buildHtmlShell(head, ssrBody, cssTags, scriptTags) };
}

export async function handlePageRoute(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
  cssTags: string,
  scriptTags: string,
  isrCache?: ISRCacheHandler,
): Promise<{ status: number; headers: Record<string, string>; body: string | ReadableStream }> {
  try {
    if (typeof route.module.default !== "function") {
      return errorResponse(500, "text/plain", "Page component must export a default function");
    }

    const routeHeaders = await resolveRouteHeaders(route, params, reqUrl);

    const isrResult = await tryISR(route, params, serverEntry, reqUrl, cssTags, scriptTags, isrCache);
    if (isrResult) return { ...isrResult, headers: { ...routeHeaders, ...isrResult.headers } };

    return await renderWithReact(route, params, serverEntry, reqUrl, cssTags, scriptTags, routeHeaders);
  } catch (err) {
    console.error("[fabrk] SSR render error:", err);
    return errorResponse(500, "text/plain", "Internal server error");
  }
}

async function tryISR(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
  cssTags: string,
  scriptTags: string,
  isrCache?: ISRCacheHandler,
): Promise<{ status: number; headers: Record<string, string>; body: string } | null> {
  const revalidateInterval = getRevalidateInterval(route.module);
  if (!isrCache || revalidateInterval === null) return null;

  const url = new URL(reqUrl, "http://localhost");
  const tags = getPageTags(route.module);
  const isrResult = await serveFromISR(
    isrCache, url.pathname, revalidateInterval,
    async () => (await renderPageToString(route, params, serverEntry, reqUrl, cssTags, scriptTags)).body,
    tags,
  );

  const isrHeader = isrResult.revalidating ? "stale" : isrResult.cached ? "hit" : "miss";
  return {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...buildSecurityHeaders(),
      "X-Fabrk-ISR": isrHeader,
    },
    body: isrResult.html,
  };
}
