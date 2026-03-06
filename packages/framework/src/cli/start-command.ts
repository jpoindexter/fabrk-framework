import path from "node:path";
import fs from "node:fs";
import { parseArgs } from "./parse-args";
import { loadFabrkViteConfig } from "./load-config";

export async function runStart(root: string, rawArgs: string[], version: string): Promise<void> {
  const args = parseArgs(rawArgs);
  const port = typeof args.port === "string" ? parseInt(args.port, 10) : 3000;
  const host = typeof args.host === "string" ? args.host : args.host === true ? "0.0.0.0" : "localhost";

  // eslint-disable-next-line no-console
  console.log(`\n  fabrk start v${version}\n`);

  const distDir = path.join(root, "dist");
  if (!fs.existsSync(distDir)) {
    console.error("  No dist/ directory found. Run `fabrk build` first.");
    process.exit(1);
  }

  const serverDir = path.join(distDir, "server");
  if (!fs.existsSync(serverDir)) {
    return startStaticPreview(root, port, host);
  }

  const serverEntryPath = findServerEntry(serverDir);
  if (!serverEntryPath) {
    console.error("  No server entry found in dist/server/. Run `fabrk build` first.");
    process.exit(1);
  }

  const middlewarePath = findMiddleware(serverDir);

  const { startProdServer } = await import("../runtime/prod-server");
  await startProdServer({ distDir, port, host, serverEntryPath, middlewarePath });
}

function findServerEntry(serverDir: string): string | undefined {
  const candidates = [
    path.join(serverDir, ".fabrk-server-entry.js"),
    path.join(serverDir, ".fabrk-server-entry.mjs"),
    path.join(serverDir, "entry.js"),
    path.join(serverDir, "entry.mjs"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const files = fs.readdirSync(serverDir).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
  return files.length > 0 ? path.join(serverDir, files[0]) : undefined;
}

function findMiddleware(serverDir: string): string | undefined {
  const candidates = [
    path.join(serverDir, "middleware.js"),
    path.join(serverDir, "middleware.mjs"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function startStaticPreview(root: string, port: number, host: string): Promise<void> {
  const { preview } = await import("vite");
  const { userConfigPath } = await loadFabrkViteConfig(root);
  const server = await preview({
    configFile: userConfigPath ?? false,
    root,
    preview: { port, host },
  });
  server.printUrls();
}
