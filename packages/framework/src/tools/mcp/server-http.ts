import { buildSecurityHeaders } from "../../middleware/security";
import { rpcError } from "./server-handlers";

const DEFAULT_RATE_LIMIT = 60;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const MAX_IPS = 10_000;
const MAX_REQUEST_BYTES = 1024 * 1024;

export { DEFAULT_RATE_LIMIT };

export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private limit = DEFAULT_RATE_LIMIT, private windowMs = DEFAULT_RATE_WINDOW_MS) {}

  check(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      this.evictIfFull(now);
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(ip, bucket);
    }

    bucket.count++;
    return {
      allowed: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  private evictIfFull(now: number): void {
    if (this.buckets.size < MAX_IPS) return;
    for (const [key, b] of this.buckets) {
      if (now >= b.resetAt) { this.buckets.delete(key); break; }
    }
    if (this.buckets.size >= MAX_IPS) {
      const oldest = this.buckets.keys().next();
      if (!oldest.done) this.buckets.delete(oldest.value);
    }
  }
}

export async function handleHttpBody(
  req: Request,
  handleRequest: (jsonRpc: unknown) => Promise<unknown>
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify(rpcError(undefined, -32600, "POST required")), {
      status: 405,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
    return new Response(
      JSON.stringify(rpcError(undefined, -32600, "Request body too large")),
      { status: 413, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return new Response(
        JSON.stringify(rpcError(undefined, -32600, "Request body too large")),
        { status: 413, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
      );
    }
    body = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify(rpcError(undefined, -32700, "Parse error")),
      { status: 400, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
    );
  }

  const result = await handleRequest(body);
  if (result === undefined) {
    return new Response(null, { status: 204, headers: buildSecurityHeaders() });
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}
