import { FABRK_NOT_FOUND, FABRK_REDIRECT, type FabrkError } from "./error-boundary";

export function notFound(): never {
  const error = new Error("Not Found") as FabrkError;
  error.digest = FABRK_NOT_FOUND;
  throw error;
}

export type RedirectStatusCode = 301 | 302 | 307 | 308;

export function redirect(
  url: string,
  status: RedirectStatusCode = 307
): never {
  validateRedirectUrl(url);
  const error = new Error(`Redirect to ${url}`) as FabrkError;
  error.digest = FABRK_REDIRECT;
  error.url = url;
  error.statusCode = status;
  throw error;
}

/**
 * Permanent redirect (308 — preserves method, cacheable).
 */
export function permanentRedirect(url: string): never {
  redirect(url, 308);
}

/**
 * Validate redirect URLs to prevent open redirect attacks.
 * Allows: relative paths (/foo, /foo/bar)
 * Blocks: javascript:, data:, vbscript: schemes; // protocol-relative (resolves to arbitrary host); CRLF
 */
export function validateRedirectUrl(url: string): void {
  const stripped = url.replace(/[\r\n]/g, "");
  const lower = stripped.toLowerCase().trimStart();

  const dangerousSchemes = ["javascript:", "data:", "vbscript:"];
  for (const scheme of dangerousSchemes) {
    if (lower.startsWith(scheme)) {
      throw new Error(`Unsafe redirect URL scheme: ${scheme}`);
    }
  }

  // // prefix is a protocol-relative URL — browser resolves to attacker's domain
  if (lower.startsWith("//")) {
    throw new Error(`Unsafe redirect URL: protocol-relative URLs not allowed`);
  }
}

export function isRedirectError(
  error: unknown
): error is FabrkError & { url: string; statusCode: number } {
  return (
    error instanceof Error &&
    (error as FabrkError).digest === FABRK_REDIRECT &&
    typeof (error as FabrkError).url === "string" &&
    typeof (error as FabrkError).statusCode === "number"
  );
}

export function isNotFoundError(error: unknown): error is FabrkError {
  return (
    error instanceof Error &&
    (error as FabrkError).digest === FABRK_NOT_FOUND
  );
}
