import type { Plugin, ViteDevServer } from "vite";
import type { ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { scanRoutes, type Route } from "./router";
import { handleRequest } from "./ssr-handler";
import { nodeToWebRequest, writeWebResponse } from "./node-web-bridge";
import { isImageRequest, handleImageRequest } from "./image-handler";
import { isOGRequest, handleOGRequest, type OGTemplate } from "./og-handler";
import { loadFabrkConfig, type FabrkConfig } from "../config/fabrk-config";
import { generateRouteTypes } from "./route-types-gen";
import { initTracer } from "./tracer";

const MIDDLEWARE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

export interface FabrkRuntimeOptions {
  /** Directory containing app/ routes. Defaults to project root. */
  appDir?: string;
  /** Custom HTML shell function. */
  htmlShell?: (options: { head: string; body: string }) => string;
  /** Enable RSC (React Server Components). Defaults to true when @vitejs/plugin-rsc is available. */
  rsc?: boolean;
  /** OG image templates keyed by name. */
  ogTemplates?: Map<string, OGTemplate>;
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
      initTracer("fabrk");

      let fabrkConfig: FabrkConfig = {};
      const configReady = loadFabrkConfig(root).then((c) => { fabrkConfig = c; });

      server.watcher.on("all", (event: string, filePath: string) => {
        if (event !== "add" && event !== "unlink") return;
        if (!filePath.startsWith(appDirResolved)) return;

        const basename = path.basename(filePath, path.extname(filePath));
        const fullBasename = path.basename(filePath);
        const isIsland = /^island\.[a-zA-Z0-9_-]+\.(tsx|ts|jsx|js)$/.test(fullBasename);
        const watchedFiles = new Set(["page", "route", "layout", "error", "loading", "not-found", "global-error"]);
        if (!watchedFiles.has(basename) && !isIsland) return;

        routes = scanRoutes(appDirResolved);
        // eslint-disable-next-line no-console
        console.log(`[fabrk] Routes updated (${routes.length} routes)`);
      });

      return () => {
        server.middlewares.use(async (req, res: ServerResponse, next) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (shouldSkipPath(pathname)) return next();

          await configReady;

          try {
            if (isImageRequest(pathname)) {
              const publicDir = path.join(root, "public");
              const webReq = await nodeToWebRequest(req, url);
              const webRes = await handleImageRequest(webReq, publicDir);
              await writeWebResponse(res, webRes);
              return;
            }

            if (isOGRequest(pathname) && options.ogTemplates) {
              const webReq = await nodeToWebRequest(req, url);
              const webRes = await handleOGRequest(webReq, options.ogTemplates);
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
              i18n: fabrkConfig.i18n,
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
      if (id === "virtual:fabrk/route-types") return "\0virtual:fabrk/route-types";
      return null;
    },

    load(id: string) {
      if (id === "\0virtual:fabrk/routes") {
        return generateRoutesModule(routes);
      }
      if (id === "\0virtual:fabrk/route-types") {
        return generateRouteTypes(routes);
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

  plugins.push(reactRefreshPlugin());

  return plugins;
}

function reactRefreshPlugin(): Plugin {
  return {
    name: "fabrk:react-refresh",

    async config(config) {
      try {
        // Dynamic string prevents TS from resolving the optional peer dep
        const specifier = "@vitejs/plugin-react";
        const mod = await import(/* @vite-ignore */ specifier);
        const pluginReact = mod.default as (opts?: Record<string, unknown>) => Plugin[];
        const refreshPlugins = pluginReact();
        const existing = Array.isArray(config.plugins) ? config.plugins : [];
        config.plugins = [...existing, ...refreshPlugins];
      } catch {
        // eslint-disable-next-line no-console
        console.log("[fabrk] @vitejs/plugin-react not found — HMR/Fast Refresh disabled");
      }
    },
  };
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

export function shouldSkipPath(pathname: string): boolean {
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/__") ||
    pathname.startsWith("/node_modules/")
  ) {
    return true;
  }
  const lastSeg = pathname.split("/").pop() ?? "";
  return lastSeg.includes(".") && !lastSeg.endsWith(".rsc");
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

const NAVIGATE_EVENT = "fabrk:navigate";
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
      window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT));
    });
  }
};

// Accept HMR updates so RSC state survives hot reloads
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
