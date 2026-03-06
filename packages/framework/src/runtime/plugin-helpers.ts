import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import type { Route } from "./router";
import type { FabrkConfig } from "../config/fabrk-config";

const MIDDLEWARE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

export function reactRefreshPlugin(opts: { getFabrkConfig: () => FabrkConfig }): Plugin {
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
          const compilerOptions = await resolveReactCompiler(fabrkConfig);
          if (compilerOptions) {
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

async function resolveReactCompiler(
  fabrkConfig: FabrkConfig
): Promise<Record<string, unknown> | null> {
  try {
    const compilerSpecifier = "babel-plugin-react-compiler";
    await import(/* @vite-ignore */ compilerSpecifier);
  } catch {
    console.warn(
      "[fabrk] reactCompiler: true requires babel-plugin-react-compiler. " +
      "Install it with: pnpm add -D babel-plugin-react-compiler"
    );
    return null;
  }

  return typeof fabrkConfig.reactCompiler === "object"
    ? fabrkConfig.reactCompiler
    : {};
}

export function findMiddleware(appDir: string): string | null {
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

export function generateRoutesModule(routes: Route[]): string {
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
