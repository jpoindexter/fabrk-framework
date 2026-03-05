import fs from "node:fs";
import path from "node:path";
import { buildSecurityHeaders } from "../middleware/security";
import { parseImageParams, negotiateImageFormat } from "../client/image";

interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  size: number;
}

const MAX_ENTRIES = 50;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

class ImageCache {
  private map = new Map<string, CacheEntry>();
  private totalSize = 0;

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.map.has(key)) {
      const old = this.map.get(key)!;
      this.totalSize -= old.size;
      this.map.delete(key);
    }

    while (
      this.map.size >= MAX_ENTRIES ||
      this.totalSize + entry.size > MAX_TOTAL_BYTES
    ) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      const oldEntry = this.map.get(oldest.value)!;
      this.totalSize -= oldEntry.size;
      this.map.delete(oldest.value);
    }

    this.map.set(key, entry);
    this.totalSize += entry.size;
  }
}

const cache = new ImageCache();

type SharpInstance = {
  resize: (width: number) => SharpInstance;
  jpeg: (opts: { quality: number }) => SharpInstance;
  webp: (opts: { quality: number }) => SharpInstance;
  avif: (opts: { quality: number }) => SharpInstance;
  toBuffer: () => Promise<Buffer>;
};

type SharpConstructor = (input: Buffer) => SharpInstance;

let sharpModule: SharpConstructor | null | false = null;

async function loadSharp(): Promise<SharpConstructor | null> {
  if (sharpModule === false) return null;
  if (sharpModule) return sharpModule;
  try {
    const mod = await (Function('return import("sharp")')() as Promise<Record<string, unknown>>);
    sharpModule = (mod.default ?? mod) as SharpConstructor;
    return sharpModule;
  } catch {
    sharpModule = false;
    return null;
  }
}

const FORMAT_CONTENT_TYPE: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

export async function handleImageRequest(
  request: Request,
  rootDir: string,
): Promise<Response> {
  const url = new URL(request.url, "http://localhost");
  const params = parseImageParams(url.searchParams);

  if (!params) {
    return new Response(JSON.stringify({ error: "Invalid image parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  // Defense-in-depth: reject URLs with traversal sequences or unsafe chars
  // BEFORE path.resolve normalization. path.resolve + startsWith catches
  // traversal too, but this allowlist prevents encoding tricks and null bytes.
  const SAFE_IMAGE_URL = /^\/[\w\-/.]+$/;
  const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
  if (!SAFE_IMAGE_URL.test(params.url) || params.url.includes("..")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }
  const requestedExt = path.extname(params.url).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(requestedExt)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  const filePath = path.resolve(rootDir, `.${params.url}`);
  if (!filePath.startsWith(path.resolve(rootDir) + path.sep)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  if (!fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: "Image not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  const inputExt = path.extname(filePath).toLowerCase();
  if (inputExt === ".gif") {
    const gifBuffer = fs.readFileSync(filePath);
    return new Response(new Uint8Array(gifBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(gifBuffer.length),
        ...buildSecurityHeaders(),
      },
    });
  }

  const acceptHeader = request.headers.get("accept");
  const format = negotiateImageFormat(acceptHeader);
  const cacheKey = `${params.url}:${params.width}:${params.quality}:${format}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(cached.size),
        ...buildSecurityHeaders(),
      },
    });
  }

  const sharp = await loadSharp();

  if (sharp) {
    try {
      const input = fs.readFileSync(filePath);
      let pipeline = sharp(input).resize(params.width);

      switch (format) {
        case "avif":
          pipeline = pipeline.avif({ quality: params.quality });
          break;
        case "webp":
          pipeline = pipeline.webp({ quality: params.quality });
          break;
        default:
          pipeline = pipeline.jpeg({ quality: params.quality });
          break;
      }

      const buffer = await pipeline.toBuffer();
      const contentType = FORMAT_CONTENT_TYPE[format];
      const entry: CacheEntry = { buffer, contentType, size: buffer.length };
      cache.set(cacheKey, entry);

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(buffer.length),
          ...buildSecurityHeaders(),
        },
      });
    } catch (err) {
      console.error("[fabrk] Image optimization error:", err);
      // Fall through to serve original
    }
  }

  const rawBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fallbackType =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    ext === ".avif" ? "image/avif" :
    ext === ".gif" ? "image/gif" :
    ext === ".svg" ? "image/svg+xml" :
    "image/jpeg";

  return new Response(new Uint8Array(rawBuffer), {
    status: 200,
    headers: {
      "Content-Type": fallbackType,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(rawBuffer.length),
      ...buildSecurityHeaders(),
    },
  });
}

export function isImageRequest(pathname: string): boolean {
  return pathname === "/_fabrk/image";
}
