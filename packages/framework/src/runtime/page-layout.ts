import type React from "react";
import {
  resolveMetadata,
  mergeMetadata,
  buildMetadataHtml,
} from "./metadata";
import type { ServerEntry } from "./route-handlers";

/**
 * Strip CRLF and other control characters from route-supplied header names
 * and values to prevent HTTP response splitting.
 */
export function sanitizeRouteHeaders(headers: Record<string, string>): Record<string, string> {
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

interface MetadataContext {
  params: Record<string, string>;
  searchParams: Record<string, string>;
}

export async function resolveHeadHtml(
  route: ServerEntry["routes"][number],
  serverEntry: ServerEntry,
  metadataContext: MetadataContext,
): Promise<string> {
  const metadataLayers = [];
  const routeEntry = route as unknown as { layoutPaths?: string[] };
  if (routeEntry.layoutPaths) {
    for (const lp of routeEntry.layoutPaths) {
      const layoutMod = serverEntry.layoutModules[lp];
      if (layoutMod) metadataLayers.push(await resolveMetadata(layoutMod, metadataContext));
    }
  }
  metadataLayers.push(await resolveMetadata(route.module, metadataContext));
  return buildMetadataHtml(mergeMetadata(metadataLayers));
}

export function wrapWithLayouts(
  element: React.ReactNode,
  route: ServerEntry["routes"][number],
  serverEntry: ServerEntry,
  createElement: typeof React.createElement,
): React.ReactNode {
  const routeEntry = route as unknown as { layoutPaths?: string[] };
  if (!routeEntry.layoutPaths) return element;

  let wrapped = element;
  for (const lp of routeEntry.layoutPaths.slice().reverse()) {
    const layoutMod = serverEntry.layoutModules[lp];
    if (layoutMod && typeof layoutMod.default === "function") {
      wrapped = createElement(
        layoutMod.default as React.FC<Record<string, unknown>>,
        { children: wrapped },
      );
    }
  }
  return wrapped;
}

export async function resolveRouteHeaders(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  reqUrl: string,
): Promise<Record<string, string>> {
  if (typeof route.module.headers !== "function") return {};
  try {
    const url = new URL(reqUrl, "http://localhost");
    const ctx = { params, searchParams: Object.fromEntries(url.searchParams.entries()) };
    const h = await (route.module.headers as (ctx: MetadataContext) => Promise<Record<string, string>> | Record<string, string>)(ctx);
    if (h && typeof h === "object") return sanitizeRouteHeaders(h as Record<string, string>);
  } catch { /* skip invalid headers export */ }
  return {};
}

export function buildHtmlShell(head: string, ssrBody: string, cssTags: string, scriptTags: string): string {
  return `<!DOCTYPE html>
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
}

export function buildStreamShell(head: string, cssTags: string, scriptTags: string): { prefix: string; suffix: string } {
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
  return { prefix, suffix };
}
