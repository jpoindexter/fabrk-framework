import type { ServerResponse } from "node:http";
import type { FabrkConfig } from "../config/fabrk-config";

export function buildSecurityHeaders(
  config?: FabrkConfig["security"]
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
  };

  // HSTS: only emitted in production — sending it on localhost or plain HTTP
  // would permanently break HTTP dev servers for the HSTS max-age duration.
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  if (config?.csp) {
    // 'unsafe-inline' is intentionally absent from script-src — it defeats XSS
    // protection. Apps that need inline scripts must use nonces or hashes.
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'";
  }

  return headers;
}

export function applySecurityHeaders(res: ServerResponse): void {
  for (const [k, v] of Object.entries(buildSecurityHeaders())) {
    res.setHeader(k, v);
  }
}
