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
import { ENTRY_CLIENT_CODE, ENTRY_CLIENT_HYDRATE_CODE } from "./entry-client-templates";
import { designSystemPlugin } from "./design-system-plugin";
import { reactRefreshPlugin, findMiddleware, shouldSkipPath, generateRoutesModule } from "./plugin-helpers";
import { loadRouteModules, prerenderStaticPages, generateSitemapSafe } from "./plugin-static-build";
export { shouldSkipPath } from "./plugin-helpers";

export interface FabrkRuntimeOptions {
  appDir?: string;
  htmlShell?: (options: { head: string; body: string }) => string;
  ogTemplates?: Map<string, OGTemplate>;
}

export function fabrkPlugin(options: FabrkRuntimeOptions = {}): Plugin[] {
  let root: string;
  let routes: Route[] = [];
  let appDirResolved: string;
  let sharedFabrkConfig: FabrkConfig = {};

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

      return { appType: "custom", ssr: { external: true } };
    },

    configureServer(server: ViteDevServer) {
      initTracer("fabrk");

      let fabrkConfig: FabrkConfig = {};
      const configReady = loadFabrkConfig(root).then((c) => { fabrkConfig = c; sharedFabrkConfig = c; });
      server.watcher.on("all", (event: string, filePath: string) => {
        if (event !== "add" && event !== "unlink") return;
        if (!filePath.startsWith(appDirResolved)) return;

        const basename = path.basename(filePath, path.extname(filePath));
        const fullBasename = path.basename(filePath);
        const isIsland = /^island\.[a-zA-Z0-9_-]+\.(tsx|ts|jsx|js)$/.test(fullBasename);
        const watchedFiles = new Set(["page", "route", "layout", "error", "loading", "not-found", "global-error"]);
        if (!watchedFiles.has(basename) && !isIsland) return;

        routes = scanRoutes(appDirResolved);
        console.log(`[fabrk] Routes updated (${routes.length} routes)`); // eslint-disable-line no-console
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
              await writeWebResponse(res, await handleImageRequest(webReq, publicDir));
              return;
            }

            if (isOGRequest(pathname) && options.ogTemplates) {
              const webReq = await nodeToWebRequest(req, url);
              await writeWebResponse(res, await handleOGRequest(webReq, options.ogTemplates));
              return;
            }

            const webReq = await nodeToWebRequest(req, url);
            const middlewarePath = findMiddleware(appDirResolved);
            const webRes = await handleRequest(webReq, {
              routes,
              viteServer: server,
              middlewarePath: middlewarePath ?? undefined,
              appDir: appDirResolved,
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

    async closeBundle() {
      if (this.meta?.watchMode !== false) return;
      const outDir = path.resolve(root, "dist", "client");
      if (!fs.existsSync(outDir)) return;

      const { collectStaticRoutes, renderStaticPage } = await import("./static-export");
      const modules = await loadRouteModules(routes);
      const staticRoutes = await collectStaticRoutes({ routes, modules });

      const { prerendered, isrPrerendered } = await prerenderStaticPages(
        staticRoutes, modules, root, outDir, renderStaticPage,
      );

      if (prerendered > 0) console.warn(`[fabrk] Pre-rendered ${prerendered} static page(s)`);
      if (isrPrerendered > 0) console.warn(`[fabrk] Pre-rendered ${isrPrerendered} ISR page(s) for warm cache`);
      await generateSitemapSafe(root, routes, modules, outDir);
    },
  };

  const virtualPlugin: Plugin = {
    name: "fabrk:virtual-entries",

    resolveId(id: string) {
      if (id === "virtual:fabrk/entry-client") return "\0virtual:fabrk/entry-client";
      if (id === "virtual:fabrk/entry-client-hydrate") return "\0virtual:fabrk/entry-client-hydrate";
      if (id === "virtual:fabrk/routes") return "\0virtual:fabrk/routes";
      if (id === "virtual:fabrk/route-types") return "\0virtual:fabrk/route-types";
      return null;
    },

    load(id: string) {
      if (id === "\0virtual:fabrk/routes") return generateRoutesModule(routes);
      if (id === "\0virtual:fabrk/route-types") return generateRouteTypes(routes);
      if (id === "\0virtual:fabrk/entry-client") return ENTRY_CLIENT_CODE;
      if (id === "\0virtual:fabrk/entry-client-hydrate") return ENTRY_CLIENT_HYDRATE_CODE;
      return null;
    },
  };

  const plugins: Plugin[] = [routerPlugin, virtualPlugin, designSystemPlugin()];
  plugins.push(reactRefreshPlugin({ getFabrkConfig: () => sharedFabrkConfig }));
  return plugins;
}
