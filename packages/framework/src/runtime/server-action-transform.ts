import type { Plugin, ViteDevServer } from "vite";
import type { ServerResponse } from "node:http";
import { createActionRegistry, handleServerAction } from "./server-actions";
import { applySecurityHeaders } from "../middleware/security";
import { nodeToWebRequest, writeWebResponse } from "./node-web-bridge";

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateActionId(filePath: string, exportName: string): string {
  const input = `${filePath}:${exportName}`;
  const h1 = djb2(input);
  const h2 = djb2(input + "\0");
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
}

const JS_TS_RE = /\.(tsx?|jsx?|mjs|mts)$/;

function hasFileLevelDirective(code: string): boolean {
  const lines = code.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
    return trimmed === '"use server"' || trimmed === '"use server";' ||
           trimmed === "'use server'" || trimmed === "'use server';";
  }
  return false;
}

function findInlineServerFunctions(code: string): Set<string> {
  const names = new Set<string>();
  const fnRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(code)) !== null) {
    const fnName = match[1];
    const bodyStart = match.index + match[0].length;
    const bodySlice = code.slice(bodyStart, bodyStart + 200);
    const firstStatement = bodySlice.split("\n").find((l) => {
      const t = l.trim();
      return t !== "" && !t.startsWith("//");
    });
    if (
      firstStatement &&
      (/^["']use server["'];?$/.test(firstStatement.trim()))
    ) {
      names.add(fnName);
    }
  }

  return names;
}

interface ExportedFn {
  name: string;
  isDefault: boolean;
  isAsync: boolean;
}

function extractExports(code: string): ExportedFn[] {
  const exports: ExportedFn[] = [];

  const fnRe = /export\s+(async\s+)?function\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(code)) !== null) {
    exports.push({ name: m[2], isDefault: false, isAsync: !!m[1] });
  }

  const constRe = /export\s+const\s+(\w+)\s*=\s*(async\s+)?(?:function|\(|[^=]+=>\s*)/g;
  while ((m = constRe.exec(code)) !== null) {
    const name = m[1];
    if (!exports.some((e) => e.name === name)) {
      exports.push({ name, isDefault: false, isAsync: !!m[2] });
    }
  }

  const defaultFnRe = /export\s+default\s+(async\s+)?function\s+(\w+)/g;
  while ((m = defaultFnRe.exec(code)) !== null) {
    exports.push({ name: m[2], isDefault: true, isAsync: !!m[1] });
  }

  if (/export\s+default\s+(async\s+)?function\s*\(/.test(code)) {
    if (!exports.some((e) => e.isDefault)) {
      const asyncMatch = code.match(/export\s+default\s+(async\s+)?function\s*\(/);
      exports.push({ name: "default", isDefault: true, isAsync: !!asyncMatch?.[1] });
    }
  }

  return exports;
}

function buildClientProxy(actionId: string, exportedFn: ExportedFn): string {
  const fnBody = `
  const res = await fetch("/_fabrk/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-action-id": "${actionId}" },
    body: JSON.stringify({ args }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Action failed");
  return data.result;`;

  if (exportedFn.isDefault) {
    return `export default async function ${exportedFn.name === "default" ? "" : exportedFn.name}(...args) {${fnBody}\n}`;
  }
  return `export async function ${exportedFn.name}(...args) {${fnBody}\n}`;
}

function transformClient(
  code: string,
  filePath: string,
  serverFns: ExportedFn[],
): string {
  let output = "";
  const actionFnNames = new Set(serverFns.map((f) => f.name));

  const lines = code.split("\n");
  const keptLines: string[] = [];
  let skipDepth = 0;
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^["']use server["'];?$/.test(trimmed)) continue;

    if (!skipping) {
      const fnMatch = trimmed.match(/^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
      const constMatch = trimmed.match(/^export\s+const\s+(\w+)/);
      const anonDefaultMatch = trimmed.match(/^export\s+default\s+(?:async\s+)?function\s*\(/);
      const matchedName = fnMatch?.[1] ?? constMatch?.[1] ?? (anonDefaultMatch ? "default" : null);

      if (matchedName && actionFnNames.has(matchedName)) {
        skipping = true;
        skipDepth = 0;
        for (const ch of line) {
          if (ch === "{") skipDepth++;
          if (ch === "}") skipDepth--;
        }
        if (skipDepth <= 0) skipping = false;
        continue;
      }
    }

    if (skipping) {
      for (const ch of line) {
        if (ch === "{") skipDepth++;
        if (ch === "}") skipDepth--;
      }
      if (skipDepth <= 0) skipping = false;
      continue;
    }

    keptLines.push(line);
  }

  output = keptLines.join("\n");

  for (const fn of serverFns) {
    const actionId = generateActionId(filePath, fn.isDefault ? "default" : fn.name);
    output += "\n" + buildClientProxy(actionId, fn);
  }

  return output;
}

function transformServer(
  code: string,
  filePath: string,
  serverFns: ExportedFn[],
): string {
  const registrations = serverFns
    .filter((fn) => !(fn.isDefault && fn.name === "default"))
    .map((fn) => {
      const actionId = generateActionId(filePath, fn.isDefault ? "default" : fn.name);
      return `globalThis.__FABRK_ACTION_REGISTRY__?.register("${actionId}", ${fn.name});`;
    }).join("\n");

  return code + "\n" + registrations + "\n";
}

/**
 * Returns all exported names from a "use server" module.
 * Handles: export [async] function name, export const name = [async] (...) =>
 */
export function extractServerExports(code: string): string[] {
  if (!/["']use server["']/.test(code)) return [];
  return extractExports(code)
    .filter((e) => !e.isDefault)
    .map((e) => e.name);
}

export {
  hasFileLevelDirective as _hasFileLevelDirective,
  findInlineServerFunctions as _findInlineServerFunctions,
  extractExports as _extractExports,
  transformClient as _transformClient,
  transformServer as _transformServer,
};

export function serverActionPlugin(): Plugin {
  const registry = createActionRegistry();
  let isSSR = false;

  return {
    name: "fabrk:server-actions",
    enforce: "pre",

    config(_config, env) {
      isSSR = env.isSsrBuild === true;
    },

    configureServer(server: ViteDevServer) {
      (globalThis as Record<string, unknown>).__FABRK_ACTION_REGISTRY__ = registry;

      return () => {
        server.middlewares.use(async (req, res: ServerResponse, next) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (pathname !== "/_fabrk/action") return next();
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          try {
            const webReq = await nodeToWebRequest(req, url);
            const webRes = await handleServerAction(webReq, registry);
            await writeWebResponse(res, webRes);
          } catch (err) {
            console.error("[fabrk] Server action endpoint error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      };
    },

    transform(code: string, id: string) {
      if (!JS_TS_RE.test(id)) return null;
      if (id.includes("node_modules")) return null;

      const fileLevel = hasFileLevelDirective(code);
      const inlineFns = findInlineServerFunctions(code);

      if (!fileLevel && inlineFns.size === 0) return null;

      const allExports = extractExports(code);

      let serverFns: ExportedFn[];
      if (fileLevel) {
        serverFns = allExports;
      } else {
        serverFns = allExports.filter((e) => inlineFns.has(e.name));
      }

      if (serverFns.length === 0) return null;

      const ssrMode = isSSR || this.environment?.name === "ssr";
      const transformed = ssrMode
        ? transformServer(code, id, serverFns)
        : transformClient(code, id, serverFns);

      return { code: transformed, map: null };
    },
  };
}
