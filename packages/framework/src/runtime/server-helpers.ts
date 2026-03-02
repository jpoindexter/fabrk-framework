import { FABRK_NOT_FOUND, FABRK_REDIRECT, type FabrkError } from "./error-boundary";

/**
 * Throw from a Server Component or route handler to render the nearest
 * not-found.tsx boundary. The error carries the FABRK_NOT_FOUND digest
 * so it survives RSC serialization.
 */
export function notFound(): never {
  const error = new Error("Not Found") as FabrkError;
  error.digest = FABRK_NOT_FOUND;
  throw error;
}

export type RedirectStatusCode = 301 | 302 | 307 | 308;

/**
 * Throw from a Server Component or route handler to issue an HTTP redirect.
 * Defaults to 307 (temporary redirect, preserves method).
 */
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
function validateRedirectUrl(url: string): void {
  const lower = url.toLowerCase().trim();

  // Block dangerous schemes
  const dangerousSchemes = ["javascript:", "data:", "vbscript:"];
  for (const scheme of dangerousSchemes) {
    if (lower.startsWith(scheme)) {
      throw new Error(`Unsafe redirect URL scheme: ${scheme}`);
    }
  }
}

/**
 * Check if a caught error is a redirect that should be converted to
 * an HTTP response. Used by the SSR handler.
 */
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

/**
 * Check if a caught error is a not-found that should render 404.
 */
export function isNotFoundError(error: unknown): error is FabrkError {
  return (
    error instanceof Error &&
    (error as FabrkError).digest === FABRK_NOT_FOUND
  );
}
