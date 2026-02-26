type AuthMode = "required" | "optional" | "none";

/**
 * Create an auth guard that checks the Authorization header.
 * Returns null if the request passes, or a Response if it should be rejected.
 */
export function createAuthGuard(
  mode: AuthMode
): (req: Request) => Promise<Response | null> {
  return async (req: Request): Promise<Response | null> => {
    if (mode === "none") return null;

    const authHeader = req.headers.get("Authorization");

    if (mode === "optional") {
      // Optional: allow requests with or without a token
      return null;
    }

    // mode === 'required'
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Authorization header with Bearer token required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authorization token is empty" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return null;
  };
}
