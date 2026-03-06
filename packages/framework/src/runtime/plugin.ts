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

const MIDDLEWARE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

export interface FabrkRuntimeOptions {
  /** Directory containing app/ routes. Defaults to project root. */
  appDir?: string;
  /** Custom HTML shell function. */
  htmlShell?: (options: { head: string; body: string }) => string;
  /** OG image templates keyed by name. */
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
      const modules = new Map<string, Record<string, unknown>>();
      for (const route of routes) {
        try {
          const mod = await import(route.filePath);
          modules.set(route.filePath, mod);
        } catch {
          // ignore missing modules
        }
      }

      const staticRoutes = await collectStaticRoutes({ routes, modules });
      let prerendered = 0;

      const isrPreDir = path.resolve(root, "dist", "server", "isr-prerender");
      let isrPrerendered = 0;

      for (const { route, params, outputPath } of staticRoutes) {
        const mod = modules.get(route.filePath);

        if (mod && typeof mod.revalidate === "number") {
          try {
            const layoutModules = new Map<string, Record<string, unknown>>();
            for (const lp of route.layoutPaths) {
              try {
                layoutModules.set(lp, await import(lp));
              } catch { /* ignore */ }
            }
            const html = await renderStaticPage(mod, params, layoutModules, route.layoutPaths);
            const safeKey = outputPath.replace(/\//g, "__").replace(/\.html$/, ".json");
            const destPath = path.join(isrPreDir, safeKey);
            fs.mkdirSync(isrPreDir, { recursive: true });
            fs.writeFileSync(destPath, JSON.stringify({
              pathname: outputPath.replace(/\/index\.html$/, "") || "/",
              html,
              revalidate: mod.revalidate as number,
              tags: Array.isArray(mod.tags) ? mod.tags : [],
            }), "utf-8");
            isrPrerendered++;
          } catch (err) {
            console.warn(`[fabrk] ISR pre-render failed for ${route.pattern}:`, err);
          }
          continue;
        }

        try {
          const layoutModules = new Map<string, Record<string, unknown>>();
          for (const lp of route.layoutPaths) {
            try {
              layoutModules.set(lp, await import(lp));
            } catch { /* ignore */ }
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- module loaded above, non-null in this path
          const html = await renderStaticPage(mod!, params, layoutModules, route.layoutPaths);
          const destPath = path.join(outDir, outputPath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, html, "utf-8");
          prerendered++;
        } catch (err) {
          console.warn(`[fabrk] Static pre-render failed for ${route.pattern}:`, err);
        }
      }

      if (prerendered > 0) {
        console.warn(`[fabrk] Pre-rendered ${prerendered} static page(s)`);
      }
      if (isrPrerendered > 0) {
        console.warn(`[fabrk] Pre-rendered ${isrPrerendered} ISR page(s) for warm cache`);
      }

      try {
        const { generateSitemap } = await import("../build/sitemap-gen");
        const { loadFabrkConfig } = await import("../config/fabrk-config");
        const fabrkConfig = await loadFabrkConfig(root).catch(() => ({}));
        const baseUrl = (fabrkConfig as Record<string, unknown>).baseUrl as string | undefined
          ?? "http://localhost:3000";
        await generateSitemap({ baseUrl, routes, modules, outDir });
        console.warn(`[fabrk] Generated sitemap.xml and robots.txt`);
      } catch (err) {
        console.warn("[fabrk] Sitemap generation failed:", err);
      }
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
      if (id === "\0virtual:fabrk/routes") {
        return generateRoutesModule(routes);
      }
      if (id === "\0virtual:fabrk/route-types") {
        return generateRouteTypes(routes);
      }
      if (id === "\0virtual:fabrk/entry-client") {
        return ENTRY_CLIENT_CODE;
      }
      if (id === "\0virtual:fabrk/entry-client-hydrate") {
        return ENTRY_CLIENT_HYDRATE_CODE;
      }
      return null;
    },
  };

  const plugins: Plugin[] = [routerPlugin, virtualPlugin, designSystemPlugin()];

  plugins.push(reactRefreshPlugin({ getFabrkConfig: () => sharedFabrkConfig }));

  return plugins;
}

function reactRefreshPlugin(opts: { getFabrkConfig: () => FabrkConfig }): Plugin {
  return {
    name: "fabrk:react-refresh",

    async config(config) {
      try {
        const specifier = "@vitejs/plugin-react";
        const mod = await import(/* @vite-ignore */ specifier);
        const pluginReact = mod.default as (opts?: Record<string, unknown>) => Plugin[];

        const reactPluginOptions: Record<string, unknown> = {};
        const fabrkConfig = opts.getFabrkConfig();

        if (fabrkConfig?.reactCompiler) {
          let compilerAvailable = false;
          try {
            const compilerSpecifier = "babel-plugin-react-compiler";
            await import(/* @vite-ignore */ compilerSpecifier);
            compilerAvailable = true;
          } catch {
            console.warn(
              "[fabrk] reactCompiler: true requires babel-plugin-react-compiler. " +
              "Install it with: pnpm add -D babel-plugin-react-compiler"
            );
          }

          if (compilerAvailable) {
            const compilerOptions =
              typeof fabrkConfig.reactCompiler === "object"
                ? fabrkConfig.reactCompiler
                : {};
            reactPluginOptions["babel"] = {
              plugins: [["babel-plugin-react-compiler", compilerOptions]],
            };
          }
        }

        const refreshPlugins = pluginReact(
          Object.keys(reactPluginOptions).length > 0 ? reactPluginOptions : undefined
        );
        const existing = Array.isArray(config.plugins) ? config.plugins : [];
        config.plugins = [...existing, ...refreshPlugins];
      } catch {
        // eslint-disable-next-line no-console
        console.log("[fabrk] @vitejs/plugin-react not found — HMR/Fast Refresh disabled");
      }
    },
  };
}

// Tailwind color names that produce hardcoded (non-semantic) classes.
const DS_HARDCODED_COLORS = [
  "slate","gray","zinc","neutral","stone",
  "red","orange","amber","yellow","lime",
  "green","emerald","teal","cyan","sky",
  "blue","indigo","violet","purple","fuchsia",
  "pink","rose",
];
const DS_COLOR_PREFIXES = ["bg","text","border","ring","fill","stroke","outline","decoration","from","via","to"];
const DS_HARDCODED_RE = new RegExp(
  `\\b(?:${DS_COLOR_PREFIXES.join("|")})-(?:${DS_HARDCODED_COLORS.join("|")})-(?:\\d+|\\[.+?\\])\\b`
);
const DS_BARE_RE = /\b(?:bg|text|border|ring)-(?:white|black)\b/;
// Catches arbitrary hex/rgb values: bg-[#fff], text-[rgb(255,0,0)], border-[hsl(0,0%,0%)]
const DS_ARBITRARY_RE = /\b(?:bg|text|border|ring|fill|stroke)-\[(?:#[0-9a-fA-F]{3,8}|rgba?|hsl)/;

function isHardcodedColor(cls: string): boolean {
  const base = cls.replace(/^(?:[a-zA-Z0-9_-]+:)+/, ""); // strip variant prefixes
  return DS_HARDCODED_RE.test(base) || DS_BARE_RE.test(base) || DS_ARBITRARY_RE.test(base);
}

/** Dev-time warning + build-time error for hardcoded Tailwind color classes in JSX/TSX files. */
function designSystemPlugin(): Plugin {
  let isBuild = false;
  return {
    name: "fabrk:design-system",
    enforce: "pre",

    configResolved(config) {
      isBuild = config.command === "build";
    },

    transform(code: string, id: string) {
      if (!/\.(tsx|jsx)$/.test(id)) return null;
      if (id.includes("node_modules")) return null;

      const classNameMatches = code.matchAll(/className\s*=\s*["'`]([^"'`]+)["'`]/g);
      for (const match of classNameMatches) {
        const violating = match[1].split(/\s+/).filter(isHardcodedColor);
        if (violating.length === 0) continue;

        const file = id.replace(process.cwd() + "/", "");
        const msg =
          `[fabrk] Design system violation in ${file}: ` +
          `hardcoded color class(es) "${violating.join(" ")}" — use semantic tokens ` +
          `(bg-primary, text-foreground, border-border, etc.)`;

        if (isBuild) {
          // Error in production builds — ESLint should catch this in CI but belt-and-suspenders
          this.error(msg);
        } else {
          console.warn(msg);
        }
      }
      return null;
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
  return lastSeg.includes(".");
}

function generateRoutesModule(routes: Route[]): string {
  const imports: string[] = [];
  const routeEntries: string[] = [];

  // Only include page routes in the client bundle. API routes have server-only
  // imports (DB credentials, secret keys, etc.) that must not reach the browser.
  const clientRoutes = routes.filter((r) => r.type === "page");

  for (let i = 0; i < clientRoutes.length; i++) {
    const route = clientRoutes[i];
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

