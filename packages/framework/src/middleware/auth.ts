import { buildSecurityHeaders } from "./security";

export interface AuthGuardOptions {
  validateToken: (token: string) => Promise<boolean> | boolean;
  /** Cookie name to read session token from. Defaults to "session". */
  cookieName?: string;
  /**
   * If set, failed auth redirects to this path (302). Otherwise returns 401 JSON.
   * Must be a relative path starting with "/" (not "//"). Absolute URLs and
   * protocol-relative paths are rejected to prevent open redirect attacks.
   */
  loginPath?: string;
}

/**
 * Validate that a redirect path is a safe relative URL.
 * Rejects absolute URLs (http://, https://), protocol-relative paths (//),
 * scheme injections (javascript:, data:), and control characters.
 */
function validateLoginPath(path: string): void {
  // Strip control characters that could smuggle scheme prefixes
  // eslint-disable-next-line no-control-regex
  const stripped = path.replace(/[\x00-\x20\x7f]/g, "");
  if (!stripped.startsWith("/") || stripped.startsWith("//")) {
    throw new Error(
      `loginPath must be a relative path starting with "/" (not "//"). Got: ${JSON.stringify(path)}`
    );
  }
}

/**
 * Creates a middleware function that validates session tokens from cookies or Bearer headers.
 * Returns null on success (pass through) or a Response on failure.
 *
 * @example
 * // In app/middleware.ts:
 * const guard = createAuthGuard({ validateToken: (t) => verifyJwt(t), loginPath: "/login" });
 * export default async function middleware(req: Request) {
 *   if (!req.url.includes("/dashboard")) return null;
 *   return guard(req);
 * }
 */
export function createAuthGuard(options: AuthGuardOptions) {
  if (options.loginPath !== undefined) {
    validateLoginPath(options.loginPath);
  }
  const cookieName = options.cookieName ?? "session";
  return async function guard(req: Request): Promise<Response | null> {
    let token: string | undefined;

    // 1. Try cookie
    const cookieHeader = req.headers.get("cookie") ?? "";
    for (const part of cookieHeader.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      if (part.slice(0, eq).trim() === cookieName) {
        token = part.slice(eq + 1).trim();
        break;
      }
    }

    // 2. Fall back to Authorization Bearer header
    if (!token) {
      const auth = req.headers.get("authorization") ?? "";
      if (auth.startsWith("Bearer ")) token = auth.slice(7);
    }

    const valid = token ? await options.validateToken(token) : false;
    if (valid) return null;

    const sec = buildSecurityHeaders();
    if (options.loginPath) {
      return new Response(null, {
        status: 302,
        headers: { location: options.loginPath, ...sec },
      });
    }
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", ...sec },
    });
  };
}
