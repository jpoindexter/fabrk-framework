import http from "node:http";
import { buildSecurityHeaders } from "../middleware/security";
import { stripTrailingSlashes } from "./server-helpers";

const MAX_BODY = 1024 * 1024;

export function nodeHeadersToRecord(headers: http.IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([, v]) => typeof v === "string") as [string, string][]
  );
}

export interface ServerEntry {
  routes: Array<{
    pattern: string;
    regex: RegExp;
    paramNames: string[];
    type: "page" | "api";
    module: Record<string, unknown>;
  }>;
  layoutModules: Record<string, Record<string, unknown>>;
  boundaryModules: Record<string, Record<string, unknown>>;
  globalError: Record<string, unknown> | null;
}

export function matchRoute(
  routes: ServerEntry["routes"],
  pathname: string,
  _softNavigation = false,
): {
  route: ServerEntry["routes"][number];
  params: Record<string, string>;
} | null {
  const normalized = pathname === "/" ? "/" : stripTrailingSlashes(pathname);

  for (const route of routes) {
    const match = route.regex.exec(normalized);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const value = match[i + 1];
        if (value !== undefined) params[route.paramNames[i]] = value;
      }
      return { route, params };
    }
  }
  return null;
}

export async function handleApiRoute(
  req: http.IncomingMessage,
  route: ServerEntry["routes"][number],
  params: Record<string, string>
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const method = (req.method || "GET").toUpperCase();
  const handler = route.module[method] ?? route.module[method.toLowerCase()];

  if (typeof handler !== "function") {
    return {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
      body: JSON.stringify({ error: `Method ${method} not allowed` }),
    };
  }

  try {
    const url = `http://localhost${req.url || "/"}`;
    const bodyChunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY) {
        return {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            ...buildSecurityHeaders(),
          },
          body: JSON.stringify({ error: "Request body too large" }),
        };
      }
      bodyChunks.push(chunk);
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers: nodeHeadersToRecord(req.headers),
      body: method !== "GET" && method !== "HEAD"
        ? Buffer.concat(bodyChunks)
        : undefined,
    });

    const response = await handler(webRequest, { params });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: { ...responseHeaders, ...buildSecurityHeaders() },
      body: await response.text(),
    };
  } catch (err) {
    console.error("[fabrk] API route error:", err);
    return {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(),
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

export async function handleEdgeRoute(
  req: http.IncomingMessage,
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
): Promise<Response> {
  const method = (req.method || "GET").toUpperCase();
  const handler = route.module[method] ?? route.module[method.toLowerCase()] ?? route.module.default;

  if (typeof handler !== "function") {
    return new Response(JSON.stringify({ error: "Edge handler not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  const bodyChunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
      });
    }
    bodyChunks.push(chunk);
  }

  const webRequest = new Request(`http://localhost${req.url || "/"}`, {
    method: req.method,
    headers: nodeHeadersToRecord(req.headers),
    body: method !== "GET" && method !== "HEAD"
      ? Buffer.concat(bodyChunks).toString()
      : undefined,
  });

  try {
    return await handler(webRequest, { params });
  } catch (err) {
    console.error("[fabrk] Edge route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }
}
