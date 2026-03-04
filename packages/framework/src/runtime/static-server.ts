import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { buildSecurityHeaders } from "../middleware/security";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".wasm": "application/wasm",
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/** Immutable cache for content-hashed filenames; no-cache for everything else. */
export function getCacheHeaders(filename: string): Record<string, string> {
  const isHashed = /[-.][\da-f]{8,}\./i.test(filename);
  if (isHashed) {
    return { "Cache-Control": "public, max-age=31536000, immutable" };
  }
  return { "Cache-Control": "public, no-cache, must-revalidate" };
}

/**
 * Serve a file from clientDir. Handles path traversal, on-the-fly
 * br/gzip compression, and correct Content-Type + security headers.
 * Returns false when the file does not exist or the path is outside clientDir.
 */
export async function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  clientDir: string
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }

  pathname = pathname.replace(/\/+/g, "/");

  const filePath = path.join(clientDir, pathname);
  const resolvedPath = path.resolve(filePath);

  const resolvedClientDir = path.resolve(clientDir);
  if (!resolvedPath.startsWith(resolvedClientDir + path.sep) && resolvedPath !== resolvedClientDir) {
    return false;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolvedPath);
  } catch {
    return false;
  }

  if (!stat.isFile()) return false;

  const mimeType = getMimeType(resolvedPath);
  const cacheHeaders = getCacheHeaders(path.basename(resolvedPath));
  const securityHeaders = buildSecurityHeaders();

  const acceptEncoding = (req.headers["accept-encoding"] as string) || "";
  const isCompressible = mimeType.includes("text/") ||
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("svg");

  let encoding: "br" | "gzip" | null = null;
  if (isCompressible && stat.size > 1024) {
    if (acceptEncoding.includes("br")) encoding = "br";
    else if (acceptEncoding.includes("gzip")) encoding = "gzip";
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    ...cacheHeaders,
    ...securityHeaders,
  };
  if (encoding) headers["Content-Encoding"] = encoding;

  res.writeHead(200, headers);

  if (encoding === "br") {
    const readStream = fs.createReadStream(resolvedPath);
    const brotli = zlib.createBrotliCompress({
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
    });
    await pipeline(readStream, brotli, res);
    return true;
  }
  if (encoding === "gzip") {
    const readStream = fs.createReadStream(resolvedPath);
    const gzip = zlib.createGzip({ level: 6 });
    await pipeline(readStream, gzip, res);
    return true;
  }

  const readStream = fs.createReadStream(resolvedPath);
  await pipeline(readStream, res);
  return true;
}
