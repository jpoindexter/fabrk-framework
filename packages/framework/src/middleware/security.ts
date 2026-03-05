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

  // Always emit a CSP. Permissive default still blocks cross-origin loads; strict
  // mode (config.csp: true) additionally removes unsafe-inline from script-src
  // to defeat XSS payloads — apps that need inline scripts should use nonces.
  if (config?.csp === false) {
    // Explicit opt-out — caller handles CSP themselves.
  } else if (config?.csp === true) {
    // Strict: no unsafe-inline in script-src
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'";
  } else {
    // Default (no config): permissive baseline — allows inline scripts so dev dashboard
    // and SSR pages with inline hydration work, while still blocking third-party origins.
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'";
  }

  return headers;
}

export function applySecurityHeaders(res: ServerResponse): void {
  for (const [k, v] of Object.entries(buildSecurityHeaders())) {
    res.setHeader(k, v);
  }
}
