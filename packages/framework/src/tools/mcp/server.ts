import type { ToolDefinition } from "../define-tool";
import { buildSecurityHeaders } from "../../middleware/security";

const JSONRPC_VERSION = "2.0";
const PROTOCOL_VERSION = "2024-11-05";

const DEFAULT_RATE_LIMIT = 60;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const MAX_IPS = 10_000;
const MAX_REQUEST_BYTES = 1024 * 1024;

class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private limit = DEFAULT_RATE_LIMIT, private windowMs = DEFAULT_RATE_WINDOW_MS) {}

  check(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      if (this.buckets.size >= MAX_IPS) {
        for (const [key, b] of this.buckets) {
          if (now >= b.resetAt) { this.buckets.delete(key); break; }
        }
        if (this.buckets.size >= MAX_IPS) {
          const oldest = this.buckets.keys().next();
          if (!oldest.done) this.buckets.delete(oldest.value);
        }
      }
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(ip, bucket);
    }

    bucket.count++;
    return {
      allowed: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}

export interface MCPServer {
  name: string;
  version: string;
  handleRequest: (jsonRpc: unknown) => Promise<unknown>;
  httpHandler: (req: Request) => Promise<Response>;
}

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

function isJsonRpc(data: unknown): data is JsonRpcRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).jsonrpc === JSONRPC_VERSION &&
    typeof (data as Record<string, unknown>).method === "string"
  );
}

function rpcResponse(id: string | number | undefined, result: unknown): unknown {
  return { jsonrpc: JSONRPC_VERSION, id: id ?? null, result };
}

function rpcError(id: string | number | undefined, code: number, message: string): unknown {
  return { jsonrpc: JSONRPC_VERSION, id: id ?? null, error: { code, message } };
}

export function createMCPServer(options: {
  name: string;
  version: string;
  tools: ToolDefinition[];
  rateLimit?: number;
  rateLimitWindowMs?: number;
}): MCPServer {
  const toolMap = new Map(options.tools.map((t) => [t.name, t]));
  const limiter = new RateLimiter(options.rateLimit, options.rateLimitWindowMs);

  async function handleRequest(jsonRpc: unknown): Promise<unknown> {
    if (!isJsonRpc(jsonRpc)) {
      return rpcError(undefined, -32600, "Invalid JSON-RPC request");
    }

    const { id, method, params } = jsonRpc;

    switch (method) {
      case "initialize":
        return rpcResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: options.name, version: options.version },
        });

      case "ping":
        return rpcResponse(id, {});

      case "notifications/initialized":
        return undefined;

      case "tools/list":
        return rpcResponse(id, {
          tools: options.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.schema,
          })),
        });

      case "tools/call": {
        const toolName = params?.name;
        if (typeof toolName !== "string") {
          return rpcError(id, -32602, "Missing tool name");
        }

        const tool = toolMap.get(toolName);
        if (!tool) {
          return rpcError(id, -32602, `Unknown tool: ${toolName}`);
        }

        try {
          const args = (params?.arguments as Record<string, unknown>) ?? {};
          const result = await tool.handler(args);
          return rpcResponse(id, {
            content: result.content,
          });
        } catch (err) {
          console.error(`[fabrk] MCP tool "${toolName}" error:`, err);
          return rpcResponse(id, {
            content: [{ type: "text", text: "Error: Tool execution failed" }],
            isError: true,
          });
        }
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  async function httpHandler(req: Request): Promise<Response> {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    const rateResult = limiter.check(clientIp);
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify(rpcError(undefined, -32600, "Rate limit exceeded")),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(options.rateLimit ?? DEFAULT_RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            ...buildSecurityHeaders(),
          },
        },
      );
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify(rpcError(undefined, -32600, "POST required")), {
        status: 405,
        headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
      });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
      return new Response(
        JSON.stringify(rpcError(undefined, -32600, "Request body too large")),
        { status: 413, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
      );
    }

    let body: unknown;
    try {
      const text = await req.text();
      if (text.length > MAX_REQUEST_BYTES) {
        return new Response(
          JSON.stringify(rpcError(undefined, -32600, "Request body too large")),
          { status: 413, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
        );
      }
      body = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify(rpcError(undefined, -32700, "Parse error")),
        { status: 400, headers: { "Content-Type": "application/json", ...buildSecurityHeaders() } }
      );
    }

    const result = await handleRequest(body);
    if (result === undefined) {
      return new Response(null, {
        status: 204,
        headers: buildSecurityHeaders(),
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  return { name: options.name, version: options.version, handleRequest, httpHandler };
}
