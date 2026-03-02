import type { ViteDevServer } from "vite";
import type { Route, RouteMatch } from "./router";
import { matchRoute, findFile } from "./router";
import { buildSecurityHeaders } from "../middleware/security";
import { isRedirectError, isNotFoundError } from "./server-helpers";
import { buildPageTree, type PageModules } from "./page-builder";
import {
  resolveMetadata,
  mergeMetadata,
  buildMetadataHtml,
  type Metadata,
} from "./metadata";
import fs from "node:fs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactModuleLoader = () => Promise<[any, any]>;

export interface SSRHandlerOptions {
  routes: Route[];
  viteServer: ViteDevServer;
  htmlShell?: (options: { head: string; body: string }) => string;
  /** Path to middleware.ts — loaded via viteServer.ssrLoadModule at request time. */
  middlewarePath?: string;
  /** Resolved app directory path for loading boundary files. */
  appDir?: string;
  /** Whether RSC mode is active (plugin-rsc installed and configured). */
  rsc?: boolean;
  /** @internal Override react module loading for testing. */
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
  const { routes, viteServer, htmlShell = DEFAULT_HTML_SHELL, middlewarePath, appDir, rsc } = options;

  if (middlewarePath) {
    try {
      const middlewareMod = await viteServer.ssrLoadModule(middlewarePath);
      const middleware = middlewareMod.default;
      if (typeof middleware === "function") {
        const middlewareResult = await middleware(request);
        if (middlewareResult instanceof Response) {
          return middlewareResult;
        }
        // Support middleware rewrites (object with rewriteUrl)
        if (middlewareResult && typeof middlewareResult === "object" && typeof middlewareResult.rewriteUrl === "string") {
          request = new Request(
            new URL(middlewareResult.rewriteUrl, request.url).toString(),
            request
          );
        }
      }
    } catch {
      // Middleware not found or errored — continue
    }
  }

  const url = new URL(request.url);
  let pathname = url.pathname;

  // Detect RSC payload requests (/path.rsc → return RSC stream)
  const isRscRequest = pathname.endsWith(".rsc");
  if (isRscRequest) {
    pathname = pathname.slice(0, -4) || "/";
  }

  const matched = matchRoute(routes, pathname);

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
    return handleApiRoute(request, matched, viteServer);
  }

  // RSC payload request — return Flight stream for client-side navigation
  if (isRscRequest && rsc) {
    return handleRscPayload(matched, viteServer, appDir);
  }

  return handlePageRoute(request, matched, viteServer, htmlShell, options._reactLoader, appDir, rsc);
}

async function handleApiRoute(
  request: Request,
  matched: RouteMatch,
  viteServer: ViteDevServer
): Promise<Response> {
  const method = request.method.toUpperCase();

  let mod: Record<string, unknown>;
  try {
    mod = await viteServer.ssrLoadModule(matched.route.filePath);
  } catch (err) {
    console.error("[fabrk] Failed to load API route:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
    });
  }

  const handler = mod[method] ?? mod[method.toLowerCase()];
  if (typeof handler !== "function") {
    return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
    });
  }

  try {
    const response = await handler(request, { params: matched.params });
    return response;
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// RSC payload (Flight stream for client-side navigation)
// ---------------------------------------------------------------------------

async function handleRscPayload(
  matched: RouteMatch,
  viteServer: ViteDevServer,
  _appDir?: string,
): Promise<Response> {
  try {
    const pageMod = await viteServer.ssrLoadModule(matched.route.filePath);
    const PageComponent = pageMod.default;

    if (typeof PageComponent !== "function") {
      return new Response("Page component must export a default function", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }

    // Load RSC entry via virtual module
    const rscEntry = await viteServer.ssrLoadModule("virtual:fabrk/entry-rsc");
    const renderRsc = rscEntry.renderRsc;

    if (typeof renderRsc !== "function") {
      return new Response("RSC renderer not available", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }

    // Load React for createElement
    const React = await import("react");
    const createElement = React.createElement ?? React.default?.createElement;

    if (typeof createElement !== "function") {
      return new Response("React not available", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }

    // Build the element tree
    let element: React.ReactNode = createElement(PageComponent as React.FC<Record<string, unknown>>, { params: matched.params });

    // Apply layouts
    for (const layoutPath of matched.route.layoutPaths.slice().reverse()) {
      const layoutMod = await viteServer.ssrLoadModule(layoutPath);
      if (typeof layoutMod.default === "function") {
        element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
      }
    }

    const rscStream = renderRsc(element);

    return new Response(rscStream, {
      status: 200,
      headers: {
        "Content-Type": "text/x-component",
        "Transfer-Encoding": "chunked",
        ...buildSecurityHeaders(),
      },
    });
  } catch (err) {
    if (isRedirectError(err)) {
      return new Response(null, {
        status: err.statusCode,
        headers: { Location: err.url, ...buildSecurityHeaders() },
      });
    }
    if (isNotFoundError(err)) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }
    console.error("[fabrk] RSC payload render error:", err);
    return new Response("Internal server error", {
      status: 500,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  }
}

// ---------------------------------------------------------------------------
// Page route SSR
// ---------------------------------------------------------------------------

async function handlePageRoute(
  _request: Request,
  matched: RouteMatch,
  viteServer: ViteDevServer,
  htmlShell: (options: { head: string; body: string }) => string,
  reactLoader?: ReactModuleLoader,
  appDir?: string,
  rsc?: boolean,
): Promise<Response> {
  try {
    const pageMod = await viteServer.ssrLoadModule(matched.route.filePath);
    const PageComponent = pageMod.default;

    if (typeof PageComponent !== "function") {
      return new Response("Page component must export a default function", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          ...buildSecurityHeaders(),
        },
      });
    }

    const layouts: Array<React.ComponentType<{ children: React.ReactNode }>> = [];
    for (const layoutPath of matched.route.layoutPaths) {
      const layoutMod = await viteServer.ssrLoadModule(layoutPath);
      if (typeof layoutMod.default === "function") {
        layouts.push(layoutMod.default);
      }
    }

    // Load boundary modules if paths exist
    const modules: PageModules = {
      page: PageComponent,
      layouts,
    };

    if (matched.route.errorPath) {
      try {
        const mod = await viteServer.ssrLoadModule(matched.route.errorPath);
        if (typeof mod.default === "function") modules.errorFallback = mod.default;
      } catch { /* boundary file failed to load — skip */ }
    }
    if (matched.route.loadingPath) {
      try {
        const mod = await viteServer.ssrLoadModule(matched.route.loadingPath);
        if (typeof mod.default === "function") modules.loadingFallback = mod.default;
      } catch { /* boundary file failed to load — skip */ }
    }
    if (matched.route.notFoundPath) {
      try {
        const mod = await viteServer.ssrLoadModule(matched.route.notFoundPath);
        if (typeof mod.default === "function") modules.notFoundFallback = mod.default;
      } catch { /* boundary file failed to load — skip */ }
    }

    // Load global-error.tsx from app root if available
    if (appDir) {
      const globalErrorPath = findFile(appDir, "global-error");
      if (globalErrorPath) {
        try {
          const mod = await viteServer.ssrLoadModule(globalErrorPath);
          if (typeof mod.default === "function") modules.globalErrorFallback = mod.default;
        } catch { /* skip */ }
      }
    }

    const url = new URL(_request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const metadataContext = { params: matched.params, searchParams };

    // Resolve metadata from layouts + page (full pipeline)
    const metadataLayers: Metadata[] = [];
    for (const layoutPath of matched.route.layoutPaths) {
      const layoutMod = await viteServer.ssrLoadModule(layoutPath);
      metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
    }
    metadataLayers.push(await resolveMetadata(pageMod, metadataContext));
    const metadata = mergeMetadata(metadataLayers);

    const loader = reactLoader ?? defaultReactLoader;
    const [reactDomServer, React] = await loader();
    const createElement = React.createElement ?? React.default?.createElement;

    if (typeof createElement !== "function") {
      return new Response("React not available", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
      });
    }

    // Build the full element tree with error/loading/not-found boundaries
    const hasBoundaries = modules.errorFallback || modules.loadingFallback ||
      modules.notFoundFallback || modules.globalErrorFallback;

    let element: React.ReactElement;
    if (hasBoundaries) {
      element = buildPageTree({
        route: matched.route,
        params: matched.params,
        searchParams,
        modules,
        pathname: url.pathname,
        React,
      });
    } else {
      // Fast path: no boundaries, build tree directly (backwards compat)
      element = createElement(PageComponent, { params: matched.params, searchParams });
      for (let i = layouts.length - 1; i >= 0; i--) {
        element = createElement(layouts[i], { children: element });
      }
    }

    // RSC path: render via Flight protocol → HTML stream
    if (rsc) {
      try {
        const rscEntry = await viteServer.ssrLoadModule("virtual:fabrk/entry-rsc");
        const ssrEntry = await viteServer.ssrLoadModule("virtual:fabrk/entry-ssr");

        if (typeof rscEntry.renderRsc === "function" && typeof ssrEntry.renderToHtml === "function") {
          const rscStream = rscEntry.renderRsc(element);
          const htmlStream = await ssrEntry.renderToHtml(rscStream, {
            bootstrapScript: `window.__FABRK_RSC__ = true;`,
          });

          return new Response(htmlStream, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Transfer-Encoding": "chunked",
              ...buildSecurityHeaders(),
            },
          });
        }
      } catch {
        // RSC modules not available — fall through to basic SSR
      }
    }

    // Basic SSR path
    const renderToReadableStream = reactDomServer.renderToReadableStream ?? reactDomServer.default?.renderToReadableStream;
    const renderToString = reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

    const indexHtmlPath = path.join(viteServer.config.root, "index.html");
    if (fs.existsSync(indexHtmlPath) && typeof renderToString === "function") {
      const ssrBody = renderToString(element);
      const html = await buildDevHtml(viteServer, matched, metadata, ssrBody, htmlShell);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
        },
      });
    }

    if (typeof renderToReadableStream === "function") {
      return streamingRender(element, renderToReadableStream, metadata, htmlShell);
    }

    if (typeof renderToString === "function") {
      const head = buildMetadataHtml(metadata);
      const ssrBody = renderToString(element);
      const html = htmlShell({ head, body: ssrBody });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...buildSecurityHeaders(),
        },
      });
    }

    console.error("[fabrk] No React SSR render function available");
    return new Response("React SSR modules not available", {
      status: 500,
      headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
    });
  } catch (err) {
    // Handle redirect errors thrown by redirect()/permanentRedirect()
    if (isRedirectError(err)) {
      return new Response(null, {
        status: err.statusCode,
        headers: {
          Location: err.url,
          ...buildSecurityHeaders(),
        },
      });
    }

    // Handle not-found errors thrown by notFound()
    if (isNotFoundError(err)) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          ...buildSecurityHeaders(),
        },
      });
    }

    console.error("[fabrk] SSR render error:", err);
    return new Response("Internal server error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        ...buildSecurityHeaders(),
      },
    });
  }
}

async function streamingRender(
  element: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderToReadableStream: (element: any) => Promise<ReadableStream>,
  metadata: Metadata,
  htmlShell: (options: { head: string; body: string }) => string
): Promise<Response> {
  const reactStream = await renderToReadableStream(element);
  const head = buildMetadataHtml(metadata);
  const marker = "<!--FABRK_BODY-->";
  const shell = htmlShell({ head, body: marker });
  const splitIndex = shell.indexOf(marker);
  const prefix = shell.slice(0, splitIndex);
  const suffix = shell.slice(splitIndex + marker.length);

  const encoder = new TextEncoder();
  const reader = reactStream.getReader();

  const stream = new ReadableStream({
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

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Transfer-Encoding": "chunked",
      ...buildSecurityHeaders(),
    },
  });
}

/**
 * Build HTML for dev mode:
 * 1. Try to read project's index.html and transform via Vite (injects HMR client + CSS)
 * 2. Inject SSR-rendered body and a hydration script
 * 3. Fall back to bare HTML shell if index.html doesn't exist
 */
async function buildDevHtml(
  viteServer: ViteDevServer,
  matched: RouteMatch,
  metadata: Metadata,
  ssrBody: string,
  fallbackShell: (options: { head: string; body: string }) => string
): Promise<string> {
  const root = viteServer.config.root;
  const indexHtmlPath = path.join(root, "index.html");

  if (!fs.existsSync(indexHtmlPath)) {
    const head = buildMetadataHtml(metadata);
    return fallbackShell({ head, body: ssrBody });
  }

  let template = fs.readFileSync(indexHtmlPath, "utf-8");

  const pageRelative = "/" + path.relative(root, matched.route.filePath).replace(/\\/g, "/");
  const clientScript = `<script type="module">
import "${pageRelative}";
</script>`;

  const layoutImports = matched.route.layoutPaths
    .map((lp) => `import "/${path.relative(root, lp).replace(/\\/g, "/")}";`)
    .join("\n");
  const layoutScript = layoutImports
    ? `<script type="module">\n${layoutImports}\n</script>`
    : "";

  template = template.replace(
    "</body>",
    `${clientScript}\n${layoutScript}\n</body>`
  );

  template = await viteServer.transformIndexHtml(
    matched.route.pattern,
    template
  );

  template = template.replace(
    '<div id="root"></div>',
    `<div id="root">${ssrBody}</div>`
  );

  // Inject full metadata into <head>
  const metadataHtml = buildMetadataHtml(metadata);
  if (metadataHtml) {
    template = template.replace("</head>", `  ${metadataHtml}\n</head>`);
  }

  return template;
}

// Vite 7's ssrLoadModule without an importer doesn't externalize CJS modules.
// Native import() handles CJS↔ESM interop correctly via Node.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function defaultReactLoader(): Promise<[any, any]> {
  const [rdServer, react] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);
  return [rdServer, react];
}
