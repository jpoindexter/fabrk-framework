import type { Route } from "./router";
import { resolveMetadata, buildMetadataHtml } from "./metadata";

export interface StaticRoute {
  route: Route;
  params: Record<string, string>;
  /** Resolved output path (e.g. "/about/index.html"). */
  outputPath: string;
}

export interface StaticExportOptions {
  /** Loaded route modules, keyed by filePath. */
  modules: Map<string, Record<string, unknown>>;
  /** Routes to consider for static generation. */
  routes: Route[];
}

/**
 * A route is eligible if it:
 * 1. Exports `generateStaticParams()` → call it to get param combinations
 * 2. Exports `dynamic = 'force-static'` → pre-render with empty params
 * 3. Has no dynamic segments and no API type → pre-render as-is
 *
 * API routes are always excluded from static generation.
 */
export async function collectStaticRoutes(
  options: StaticExportOptions,
): Promise<StaticRoute[]> {
  const { modules, routes } = options;
  const result: StaticRoute[] = [];

  for (const route of routes) {
    if (route.type === "api") continue;

    const mod = modules.get(route.filePath);
    if (!mod) continue;

    const generateStaticParams = mod.generateStaticParams;
    const dynamicExport = mod.dynamic as string | undefined;

    if (typeof generateStaticParams === "function") {
      try {
        const paramsList = await generateStaticParams();
        if (!Array.isArray(paramsList)) {
          console.warn(
            `[fabrk] generateStaticParams() for ${route.pattern} did not return an array`,
          );
          continue;
        }

        for (const params of paramsList) {
          if (typeof params !== "object" || params === null) continue;
          const outputPath = resolveOutputPath(route.pattern, params);
          result.push({ route, params, outputPath });
        }
      } catch (err) {
        console.error(
          `[fabrk] generateStaticParams() failed for ${route.pattern}:`,
          err,
        );
      }
    } else if (dynamicExport === "force-static") {
      const outputPath = resolveOutputPath(route.pattern, {});
      result.push({ route, params: {}, outputPath });
    } else if (!hasDynamicSegments(route.pattern)) {
      const outputPath = resolveOutputPath(route.pattern, {});
      result.push({ route, params: {}, outputPath });
    }
  }

  return result;
}

function hasDynamicSegments(pattern: string): boolean {
  return pattern.includes(":");
}

/**
 * `/blog/:slug` + `{ slug: "hello" }` → `/blog/hello/index.html`
 * `/` → `/index.html`
 * `/about` → `/about/index.html`
 */
export function resolveOutputPath(
  pattern: string,
  params: Record<string, string>,
): string {
  let resolved = pattern;

  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, () => value);
  }

  if (resolved === "/") return "/index.html";
  resolved = resolved.replace(/\/+$/, "");
  return `${resolved}/index.html`;
}

/**
 * Dynamically imports React/ReactDOM to avoid bundling them into the
 * build tool itself.
 */
export async function renderStaticPage(
  mod: Record<string, unknown>,
  params: Record<string, string>,
  layoutModules?: Map<string, Record<string, unknown>>,
  layoutPaths?: string[],
): Promise<string> {
  const [reactDomServer, React] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);

  const createElement = React.createElement ?? React.default?.createElement;
  const renderToString =
    reactDomServer.renderToString ?? reactDomServer.default?.renderToString;

  if (typeof createElement !== "function" || typeof renderToString !== "function") {
    throw new Error("React SSR modules not available for static generation");
  }

  const PageComponent = mod.default;
  if (typeof PageComponent !== "function") {
    throw new Error("Page must export a default function component");
  }

  let element: React.ReactNode = createElement(PageComponent as React.FC<Record<string, unknown>>, { params });

  if (layoutModules && layoutPaths) {
    for (const lp of layoutPaths.slice().reverse()) {
      const layoutMod = layoutModules.get(lp);
      if (layoutMod && typeof layoutMod.default === "function") {
        element = createElement(layoutMod.default as React.FC<Record<string, unknown>>, { children: element });
      }
    }
  }

  const ssrBody = renderToString(element);

  const metadata = await resolveMetadata(mod, { params });
  const head = buildMetadataHtml(metadata);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head}
</head>
<body>
  <div id="root">${ssrBody}</div>
</body>
</html>`;
}
