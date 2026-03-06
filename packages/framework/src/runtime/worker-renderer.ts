import type { Route } from "./router";
import { buildSecurityHeaders } from "../middleware/security";

export async function handleWorkerApiRoute(
  request: Request,
  matched: { route: Route; params: Record<string, string> },
  modules?: Map<string, Record<string, unknown>>
): Promise<Response> {
  const method = request.method.toUpperCase();

  const mod = modules?.get(matched.route.filePath);
  if (!mod) return jsonError("Route module not available", 501);

  const handler = mod[method] ?? mod[method.toLowerCase()];
  if (typeof handler !== "function") return jsonError(`Method ${method} not allowed`, 405);

  try {
    return await handler(request, { params: matched.params });
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return jsonError("Internal server error", 500);
  }
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

export function textError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain", ...buildSecurityHeaders() },
  });
}
