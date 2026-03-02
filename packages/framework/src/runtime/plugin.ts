import type { Plugin, ViteDevServer } from "vite";
import type { ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { scanRoutes, type Route } from "./router";
import { handleRequest } from "./ssr-handler";
import { nodeToWebRequest, writeWebResponse } from "./node-web-bridge";
import { isImageRequest, handleImageRequest } from "./image-handler";

const MIDDLEWARE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

export interface FabrkRuntimeOptions {
  /** Directory containing app/ routes. Defaults to project root. */
  appDir?: string;
  /** Custom HTML shell function. */
  htmlShell?: (options: { head: string; body: string }) => string;
  /** Enable RSC (React Server Components). Defaults to true when @vitejs/plugin-rsc is available. */
  rsc?: boolean;
}

export function fabrkPlugin(options: FabrkRuntimeOptions = {}): Plugin[] {
  let root: string;
  let routes: Route[] = [];
  let appDirResolved: string;

  const routerPlugin: Plugin = {
    name: "fabrk:router",
    enforce: "pre",

    config(config) {
      root = config.root ?? process.cwd();
      appDirResolved = path.resolve(root, options.appDir ?? "app");
      routes = scanRoutes(appDirResolved);

      if (routes.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[fabrk] Discovered ${routes.length} route(s): ${routes.map((r) => r.pattern).join(", ")}`
        );
      }

      return {
        appType: "custom",
        ssr: {
          external: true,
        },
      };
    },

    configureServer(server: ViteDevServer) {
      server.watcher.on("all", (event: string, filePath: string) => {
        if (event !== "add" && event !== "unlink") return;
        if (!filePath.startsWith(appDirResolved)) return;

        const basename = path.basename(filePath, path.extname(filePath));
        const watchedFiles = new Set(["page", "route", "layout", "error", "loading", "not-found", "global-error"]);
        if (!watchedFiles.has(basename)) return;

        routes = scanRoutes(appDirResolved);
        // eslint-disable-next-line no-console
        console.log(`[fabrk] Routes updated (${routes.length} routes)`);
      });

      return () => {
        server.middlewares.use(async (req, res: ServerResponse, next) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (shouldSkipPath(pathname)) return next();

          try {
            // Image optimization endpoint
            if (isImageRequest(pathname)) {
              const publicDir = path.join(root, "public");
              const webReq = await nodeToWebRequest(req, url);
              const webRes = await handleImageRequest(webReq, publicDir);
              await writeWebResponse(res, webRes);
              return;
            }

            const webReq = await nodeToWebRequest(req, url);
            const middlewarePath = findMiddleware(appDirResolved);
            const webRes = await handleRequest(webReq, {
              routes,
              viteServer: server,
              middlewarePath: middlewarePath ?? undefined,
              appDir: appDirResolved,
              rsc: options.rsc !== false,
            });

            await writeWebResponse(res, webRes);
          } catch (err) {
            console.error("[fabrk] Request handling error:", err);
            next(err);
          }
        });
      };
    },
  };

  const virtualPlugin: Plugin = {
    name: "fabrk:virtual-entries",

    resolveId(id: string) {
      if (id === "virtual:fabrk/entry-client") return "\0virtual:fabrk/entry-client";
      if (id === "virtual:fabrk/entry-ssr") return "\0virtual:fabrk/entry-ssr";
      if (id === "virtual:fabrk/entry-rsc") return "\0virtual:fabrk/entry-rsc";
      if (id === "virtual:fabrk/routes") return "\0virtual:fabrk/routes";
      return null;
    },

    load(id: string) {
      if (id === "\0virtual:fabrk/routes") {
        return generateRoutesModule(routes);
      }
      if (id === "\0virtual:fabrk/entry-client") {
        return ENTRY_CLIENT_CODE;
      }
      if (id === "\0virtual:fabrk/entry-ssr") {
        return ENTRY_SSR_CODE;
      }
      if (id === "\0virtual:fabrk/entry-rsc") {
        return ENTRY_RSC_CODE;
      }
      return null;
    },
  };

  const plugins: Plugin[] = [routerPlugin, virtualPlugin];

  if (options.rsc !== false) {
    plugins.push(rscIntegrationPlugin());
  }

  return plugins;
}

function rscIntegrationPlugin(): Plugin {
  return {
    name: "fabrk:rsc-integration",

    async config(config) {
      try {
        const mod = await import("@vitejs/plugin-rsc");
        const vitePluginRsc = mod.default as (opts?: Record<string, unknown>) => Plugin[];

        const rscPlugins = vitePluginRsc({
          entries: {
            client: "virtual:fabrk/entry-client",
            ssr: "virtual:fabrk/entry-ssr",
          },
        });

        const existing = Array.isArray(config.plugins) ? config.plugins : [];
        config.plugins = [...existing, ...rscPlugins];
      } catch {
        // eslint-disable-next-line no-console
        console.log("[fabrk] @vitejs/plugin-rsc not found — using basic SSR mode");
      }
    },
  };
}

function findMiddleware(appDir: string): string | null {
  for (const ext of MIDDLEWARE_EXTENSIONS) {
    const filePath = path.join(appDir, `middleware${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith("/@") ||
    pathname.startsWith("/__") ||
    pathname.startsWith("/node_modules/") ||
    pathname.includes(".")
  );
}

function generateRoutesModule(routes: Route[]): string {
  const imports: string[] = [];
  const routeEntries: string[] = [];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const varName = `route${i}`;
    imports.push(`import * as ${varName} from ${JSON.stringify(route.filePath)};`);
    routeEntries.push(
      `  { pattern: ${JSON.stringify(route.pattern)}, module: ${varName}, type: ${JSON.stringify(route.type)} }`
    );
  }

  return [
    ...imports,
    "",
    `export const routes = [`,
    routeEntries.join(",\n"),
    `];`,
  ].join("\n");
}

const ENTRY_RSC_CODE = `
import { renderToReadableStream, createClientManifest } from "@vitejs/plugin-rsc/rsc";

export function renderRsc(element) {
  const manifest = createClientManifest();
  return renderToReadableStream(element, manifest);
}

export { createClientManifest };
`;

const ENTRY_SSR_CODE = `
import { createFromReadableStream } from "react-server-dom-webpack/client";
import { renderToReadableStream } from "react-dom/server";
import { injectRSCPayload } from "rsc-html-stream/server";
import * as React from "react";

export async function renderToHtml(rscStream, options = {}) {
  const [forSsr, forClient] = rscStream.tee();
  const contentPromise = createFromReadableStream(forSsr);

  function App() {
    return React.use(contentPromise);
  }

  const htmlStream = await renderToReadableStream(
    React.createElement(App),
    { bootstrapScriptContent: options.bootstrapScript }
  );

  return htmlStream.pipeThrough(
    injectRSCPayload(forClient, { nonce: options.nonce })
  );
}
`;

const ENTRY_CLIENT_CODE = `
import { createFromReadableStream } from "react-server-dom-webpack/client";
import { rscStream } from "rsc-html-stream/client";
import { hydrateRoot, createRoot } from "react-dom/client";
import * as React from "react";

const contentPromise = createFromReadableStream(rscStream);
let currentContent = contentPromise;

function App() {
  return React.use(currentContent);
}

const rootEl = document.getElementById("root");
let reactRoot;

if (rootEl) {
  reactRoot = hydrateRoot(rootEl, React.createElement(App));
}

// RSC navigation: fetch .rsc payload and re-render
window.__FABRK_RSC_NAVIGATE__ = async function(url) {
  const rscUrl = url.endsWith("/") ? url.slice(0, -1) + ".rsc" : url + ".rsc";
  const response = await fetch(rscUrl);
  if (!response.ok) {
    window.location.href = url;
    return;
  }
  currentContent = createFromReadableStream(response.body);
  if (reactRoot) {
    React.startTransition(() => {
      reactRoot.render(React.createElement(App));
    });
  }
};
`;
