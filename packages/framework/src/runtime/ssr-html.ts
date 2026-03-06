/**
 * HTML assembly for SSR: streaming render wrapper and dev-mode HTML template.
 */

import type { ViteDevServer } from "vite";
import type { RouteMatch } from "./router-types";
import type { Metadata } from "./metadata";
import { buildMetadataHtml } from "./metadata";
import { buildSecurityHeaders } from "../middleware/security";
import fs from "node:fs";
import path from "node:path";

export async function streamingRender(
  element: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderToReadableStream: (element: any, options?: any) => Promise<ReadableStream>,
  metadata: Metadata,
  htmlShell: (options: { head: string; body: string }) => string,
  extraHeaders: Record<string, string> = {},
  ppr?: boolean,
): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderOptions: any = {};
  if (ppr) {
    renderOptions.onPostpone = () => { /* PPR: allow deferred streaming */ };
  }
  const reactStream = await renderToReadableStream(element, renderOptions);
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

  return new Response(stream, {
    status: 200,
    headers: {
      ...extraHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Transfer-Encoding": "chunked",
      ...buildSecurityHeaders(),
    },
  });
}

export async function buildDevHtml(
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
import ${JSON.stringify(pageRelative)};
</script>`;

  const layoutImports = matched.route.layoutPaths
    .map((lp) => `import ${JSON.stringify("/" + path.relative(root, lp).replace(/\\/g, "/"))};`)
    .join("\n");
  const layoutScript = layoutImports
    ? `<script type="module">\n${layoutImports}\n</script>`
    : "";

  template = template.replace("</body>", `${clientScript}\n${layoutScript}\n</body>`);
  template = await viteServer.transformIndexHtml(matched.route.pattern, template);
  template = template.replace('<div id="root"></div>', `<div id="root">${ssrBody}</div>`);

  const metadataHtml = buildMetadataHtml(metadata);
  if (metadataHtml) {
    template = template.replace("</head>", `  ${metadataHtml}\n</head>`);
  }

  return template;
}
