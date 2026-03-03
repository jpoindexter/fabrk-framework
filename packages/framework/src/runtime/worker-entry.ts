import { matchRoute, type Route } from "./router";
import { buildSecurityHeaders } from "../middleware/security";
import { isRedirectError, isNotFoundError } from "./server-helpers";
import {
  resolveMetadata,
  mergeMetadata,
  buildMetadataHtml,
} from "./metadata";
import { isImageRequest } from "./image-handler";

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
          return new Response(JSON.stringify({ error: "Image optimization not available in worker mode" }), {
            status: 501,
            headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
          });
        }

        const isSoftNav = request.headers.get("x-fabrk-navigation") === "soft";
        const matched = matchRoute(routes, url.pathname, isSoftNav);

        if (!matched) {
          return new Response("Not Found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
              ...buildSecurityHeaders(),
            },
          });
        }

        if (matched.route.type === "api") {
          return handleApiRoute(request, matched, modules);
        }

        return handlePageRoute(request, matched, modules, layoutModules);
      } catch (err) {
        if (isRedirectError(err)) {
          return new Response(null, {
            status: err.statusCode,
            headers: {
              Location: err.url,
              ...buildSecurityHeaders(),
            },
          });
        }

        if (isNotFoundError(err)) {
          return new Response("Not Found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
              ...buildSecurityHeaders(),
            },
          });
        }

        console.error("[fabrk] Worker error:", err);
        return new Response("Internal server error", {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
            ...buildSecurityHeaders(),
          },
        });
      }
    },
  };
}

async function handleApiRoute(
  request: Request,
  matched: { route: Route; params: Record<string, string> },
  modules?: Map<string, Record<string, unknown>>
): Promise<Response> {
  const method = request.method.toUpperCase();

  const mod = modules?.get(matched.route.filePath);
  if (!mod) {
    return new Response(
      JSON.stringify({ error: "Route module not available" }),
      {
        status: 501,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      }
    );
  }

  const handler = mod[method] ?? mod[method.toLowerCase()];
  if (typeof handler !== "function") {
    return new Response(
      JSON.stringify({ error: `Method ${method} not allowed` }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      }
    );
  }

  try {
    const response = await handler(request, { params: matched.params });
    return response;
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      }
    );
  }
}

async function handlePageRoute(
  request: Request,
  matched: { route: Route; params: Record<string, string> },
  modules?: Map<string, Record<string, unknown>>,
  layoutModules?: Map<string, Record<string, unknown>>
): Promise<Response> {
  const mod = modules?.get(matched.route.filePath);
  if (!mod) {
    return new Response(
      JSON.stringify({ error: "Route module not available" }),
      {
        status: 501,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      }
    );
  }

  const PageComponent = mod.default;
  if (typeof PageComponent !== "function") {
    return new Response("Page component must export a default function", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      },
    });
  }

  try {
    const [reactDomServer, React] = await Promise.all([
      import("react-dom/server"),
      import("react"),
    ]);

    const createElement = React.createElement ?? React.default?.createElement;
    const renderToReadableStream =
      reactDomServer.renderToReadableStream ??
      reactDomServer.default?.renderToReadableStream;
    const renderToString =
      reactDomServer.renderToString ??
      reactDomServer.default?.renderToString;

    if (typeof createElement !== "function") {
      return new Response("React not available in worker environment", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const metadataContext = { params: matched.params, searchParams };

    const metadataLayers = [];
    if (layoutModules) {
      for (const lp of matched.route.layoutPaths) {
        const layoutMod = layoutModules.get(lp);
        if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
      }
    }
    metadataLayers.push(await resolveMetadata(mod, metadataContext));
    const metadata = mergeMetadata(metadataLayers);
    const head = buildMetadataHtml(metadata);

    let element: React.ReactNode = createElement(
      PageComponent as React.FC<Record<string, unknown>>,
      { params: matched.params, searchParams }
    );

    if (layoutModules) {
      for (const lp of matched.route.layoutPaths.slice().reverse()) {
        const layoutMod = layoutModules.get(lp);
        if (layoutMod && typeof layoutMod.default === "function") {
          element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
        }
      }
    }

    if (typeof renderToReadableStream === "function") {
      const stream = await renderToReadableStream(element);

      const prefix = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
</head>
<body>
  <div id="root">`;
      const suffix = `</div>
</body>
</html>`;

      const encoder = new TextEncoder();
      const reader = stream.getReader();

      const wrappedStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(prefix));
        },
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode(suffix));
            controller.close();
            return;
          }
          controller.enqueue(value);
        },
      });

      return new Response(wrappedStream, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
        },
      });
    }

    if (typeof renderToString === "function") {
      const ssrBody = renderToString(element);
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${head}
</head>
<body>
  <div id="root">${ssrBody}</div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
        },
      });
    }

    return new Response("React SSR not available in worker", {
      status: 500,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  } catch (err) {
    console.error("[fabrk] Page render error:", err);
    return new Response("Internal server error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      },
    });
  }
}

export type { Route } from "./router";
