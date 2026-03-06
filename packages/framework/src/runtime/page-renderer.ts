import { buildSecurityHeaders } from "../middleware/security";
import {
  resolveMetadata,
  mergeMetadata,
  buildMetadataHtml,
} from "./metadata";
import {
  serveFromISR,
  getRevalidateInterval,
  getPageTags,
  type ISRCacheHandler,
} from "./isr-cache";
import type { ServerEntry } from "./route-handlers";

/**
 * Strip CRLF and other control characters from route-supplied header names
 * and values to prevent HTTP response splitting.
 */
function sanitizeRouteHeaders(headers: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    // eslint-disable-next-line no-control-regex
    const safeName = k.replace(/[\x00-\x1f\x7f]/g, "");
    if (!safeName) continue;
    // eslint-disable-next-line no-control-regex
    safe[safeName] = v.replace(/[\x00-\x08\x0a-\x1f\x7f]/g, "").replace(/\r/g, "");
  }
  return safe;
}

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
  const metadataContext = { params, searchParams };

  const metadataLayers = [];
  const routeEntry = route as unknown as { layoutPaths?: string[] };
  if (routeEntry.layoutPaths) {
    for (const lp of routeEntry.layoutPaths) {
      const layoutMod = serverEntry.layoutModules[lp];
      if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
    }
  }
  metadataLayers.push(await resolveMetadata(route.module, metadataContext));
  const metadata = mergeMetadata(metadataLayers);
  const head = buildMetadataHtml(metadata);

  let element: React.ReactNode = createElement(
    route.module.default as React.FC<Record<string, unknown>>,
    { params, searchParams }
  );

  if (routeEntry.layoutPaths) {
    for (const lp of routeEntry.layoutPaths.slice().reverse()) {
      const layoutMod = serverEntry.layoutModules[lp];
      if (layoutMod && typeof layoutMod.default === "function") {
        element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
      }
    }
  }

  const ssrBody = renderToString(element);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${cssTags}
</head>
<body>
  <div id="root">${ssrBody}</div>
${scriptTags}
</body>
</html>`;

  return { status: 200, body: html };
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
    const PageComponent = route.module.default;
    if (typeof PageComponent !== "function") {
      return {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          ...buildSecurityHeaders(),
        },
        body: "Page component must export a default function",
      };
    }

    let routeHeaders: Record<string, string> = {};
    if (typeof route.module.headers === "function") {
      try {
        const url = new URL(reqUrl, "http://localhost");
        const ctx = { params, searchParams: Object.fromEntries(url.searchParams.entries()) };
        const h = await (route.module.headers as (ctx: { params: Record<string, string>; searchParams: Record<string, string> }) => Promise<Record<string, string>> | Record<string, string>)(ctx);
        if (h && typeof h === "object") routeHeaders = sanitizeRouteHeaders(h as Record<string, string>);
      } catch { /* skip invalid headers export */ }
    }

    const revalidateInterval = getRevalidateInterval(route.module);
    if (isrCache && revalidateInterval !== null) {
      const url = new URL(reqUrl, "http://localhost");
      const tags = getPageTags(route.module);
      const isrResult = await serveFromISR(
        isrCache,
        url.pathname,
        revalidateInterval,
        async () => {
          const result = await renderPageToString(route, params, serverEntry, reqUrl, cssTags, scriptTags);
          return result.body;
        },
        tags,
      );
      return {
        status: 200,
        headers: {
          ...routeHeaders,
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
          ...(isrResult.revalidating ? { "X-Fabrk-ISR": "stale" } : { "X-Fabrk-ISR": isrResult.cached ? "hit" : "miss" }),
        },
        body: isrResult.html,
      };
    }

    const [reactDomServer, React] = await Promise.all([
      import("react-dom/server"),
      import("react"),
    ]);

    const createElement = React.createElement ?? React.default?.createElement;
    const renderToString =
      reactDomServer.renderToString ?? reactDomServer.default?.renderToString;
    const renderToReadableStream =
      reactDomServer.renderToReadableStream ?? reactDomServer.default?.renderToReadableStream;

    if (typeof createElement !== "function") {
      return {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
        body: "React SSR modules not available",
      };
    }

    const url = new URL(reqUrl, "http://localhost");
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const metadataContext = { params, searchParams };

    const metadataLayers = [];
    const routeEntry = route as unknown as { layoutPaths?: string[] };
    if (routeEntry.layoutPaths) {
      for (const lp of routeEntry.layoutPaths) {
        const layoutMod = serverEntry.layoutModules[lp];
        if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
      }
    }
    metadataLayers.push(await resolveMetadata(route.module, metadataContext));
    const metadata = mergeMetadata(metadataLayers);
    const head = buildMetadataHtml(metadata);

    let element: React.ReactNode = createElement(
      PageComponent as React.FC<Record<string, unknown>>,
      { params, searchParams }
    );

    if (routeEntry.layoutPaths) {
      for (const lp of routeEntry.layoutPaths.slice().reverse()) {
        const layoutMod = serverEntry.layoutModules[lp];
        if (layoutMod && typeof layoutMod.default === "function") {
          element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
        }
      }
    }

    if (typeof renderToReadableStream === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderOpts: any = {};
      const routeAny = route as Record<string, unknown>;
      if (routeAny.ppr === true) {
        renderOpts.onPostpone = () => { /* PPR: allow deferred streaming */ };
      }
      const reactStream = await renderToReadableStream(element, renderOpts);

      const prefix = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${cssTags}
</head>
<body>
  <div id="root">`;
      const suffix = `</div>
${scriptTags}
</body>
</html>`;

      const encoder = new TextEncoder();
      const reader = reactStream.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(prefix));
        },
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode(suffix));
              controller.close();
              return;
            }
            controller.enqueue(value);
          } catch {
            controller.close();
          }
        },
      });

      return {
        status: 200,
        headers: {
          ...routeHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Transfer-Encoding": "chunked",
          ...buildSecurityHeaders(),
        },
        body: stream,
      };
    }

    if (typeof renderToString !== "function") {
      return {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
        body: "React SSR modules not available",
      };
    }

    const ssrBody = renderToString(element);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
${cssTags}
</head>
<body>
  <div id="root">${ssrBody}</div>
${scriptTags}
</body>
</html>`;

    return {
      status: 200,
      headers: {
        ...routeHeaders,
        "Content-Type": "text/html; charset=utf-8",
        ...buildSecurityHeaders(),
      },
      body: html,
    };
  } catch (err) {
    console.error("[fabrk] SSR render error:", err);
    return {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      },
      body: "Internal server error",
    };
  }
}
