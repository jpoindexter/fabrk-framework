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
 * Allows: relative paths (/foo, /foo/bar), protocol-relative (//example.com)
 * Blocks: javascript:, data:, vbscript: schemes
 */
export function validateRedirectUrl(url: string): void {
  const lower = url.toLowerCase().trim();

  const dangerousSchemes = ["javascript:", "data:", "vbscript:"];
  for (const scheme of dangerousSchemes) {
    if (lower.startsWith(scheme)) {
      throw new Error(`Unsafe redirect URL scheme: ${scheme}`);
    }
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
