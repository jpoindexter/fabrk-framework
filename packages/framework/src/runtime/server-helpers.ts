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
 * Allowlist: only relative paths starting with "/" (not "//") are permitted.
 * This blocks absolute URLs (http://, https://), protocol-relative (//),
 * scheme-injection (javascript:, data:), and CRLF header injection.
 */
export function validateRedirectUrl(url: string): void {
  // Strip all control characters and whitespace variants that could be used
  // to smuggle scheme prefixes past trimStart() (tab, VT, FF, CRLF, etc.)
  // eslint-disable-next-line no-control-regex -- intentionally strips ASCII control chars 0x00–0x20 and DEL (0x7f)
  const stripped = url.replace(/[\x00-\x20\x7f]/g, "");

  // Allowlist: must start with exactly one "/" (relative path).
  // "//" is a protocol-relative URL and resolves to an arbitrary host.
  // Any other prefix (http://, https://, javascript:, etc.) is rejected.
  if (!stripped.startsWith("/") || stripped.startsWith("//")) {
    throw new Error("Unsafe redirect URL: only relative paths are allowed");
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

/**
 * Remove trailing slashes without regex (avoids CodeQL ReDoS flag on /\/+$/).
 */
export function stripTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 1 && s.charCodeAt(end - 1) === 47 /* '/' */) end--;
  return end === s.length ? s : s.slice(0, end);
}

export function isNotFoundError(error: unknown): error is FabrkError {
  return (
    error instanceof Error &&
    (error as FabrkError).digest === FABRK_NOT_FOUND
  );
}
