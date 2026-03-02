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

  if (config?.csp) {
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'";
  }

  return headers;
}

export function applySecurityHeaders(res: ServerResponse): void {
  for (const [k, v] of Object.entries(buildSecurityHeaders())) {
    res.setHeader(k, v);
  }
}
