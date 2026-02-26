import { buildSecurityHeaders } from "./security";

type AuthMode = "required" | "optional" | "none";

export interface AuthGuardOptions {
  mode: AuthMode;
  validateToken?: (token: string) => boolean | Promise<boolean>;
}

function errorResponse(body: { error: string }, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

export function createAuthGuard(
  modeOrOptions: AuthMode | AuthGuardOptions
): (req: Request) => Response | null | Promise<Response | null> {
  const options: AuthGuardOptions =
    typeof modeOrOptions === "string"
      ? { mode: modeOrOptions }
      : modeOrOptions;

  const { mode, validateToken } = options;

  return async (req: Request): Promise<Response | null> => {
    if (mode === "none") return null;

    const authHeader = req.headers.get("Authorization");

    if (mode === "optional" && !authHeader) return null;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (mode === "optional") return null;
      return errorResponse(
        { error: "Authorization header with Bearer token required" },
        401
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return errorResponse({ error: "Authorization token is empty" }, 401);
    }

    if (validateToken) {
      const valid = await validateToken(token);
      if (!valid) {
        return errorResponse({ error: "Invalid token" }, 403);
      }
    }

    return null;
  };
}
