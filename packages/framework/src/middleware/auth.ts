import { buildSecurityHeaders } from "./security";

export interface AuthGuardOptions {
  validateToken: (token: string) => Promise<boolean> | boolean;
  /** Cookie name to read session token from. Defaults to "session". */
  cookieName?: string;
  /** If set, failed auth redirects to this path (302). Otherwise returns 401 JSON. */
  loginPath?: string;
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
