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

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<string>;
}

export interface MCPPromptArg {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptDef {
  name: string;
  description?: string;
  arguments?: MCPPromptArg[];
  handler: (args: Record<string, string>) => string;
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
  resources?: MCPResource[];
  prompts?: MCPPromptDef[];
  rateLimit?: number;
  rateLimitWindowMs?: number;
  /**
   * Trust `X-Forwarded-For` / `X-Real-IP` headers for per-IP rate limiting.
   * Only enable when the MCP server sits behind a trusted reverse proxy that
   * sets these headers. Without a proxy, clients can spoof them and bypass
   * per-IP limits. Default: `false` (all anonymous requests share one bucket).
   */
  trustForwardedFor?: boolean;
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
          capabilities: {
            tools: {},
            ...(options.resources?.length ? { resources: {} } : {}),
            ...(options.prompts?.length ? { prompts: {} } : {}),
          },
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

      case "resources/list":
        return rpcResponse(id, {
          resources: (options.resources ?? []).map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        });

      case "resources/read": {
        const uri = params?.uri;
        if (typeof uri !== "string") {
          return rpcError(id, -32602, "Missing resource uri");
        }
        const resource = (options.resources ?? []).find((r) => r.uri === uri);
        if (!resource) {
          return rpcError(id, -32602, `Unknown resource: ${uri}`);
        }
        try {
          const text = await resource.read();
          return rpcResponse(id, {
            contents: [{ uri: resource.uri, mimeType: resource.mimeType ?? "text/plain", text }],
          });
        } catch (err) {
          console.error(`[fabrk] MCP resource "${uri}" error:`, err);
          return rpcError(id, -32603, "Resource read failed");
        }
      }

      case "prompts/list":
        return rpcResponse(id, {
          prompts: (options.prompts ?? []).map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments,
          })),
        });

      case "prompts/get": {
        const promptName = params?.name;
        if (typeof promptName !== "string") {
          return rpcError(id, -32602, "Missing prompt name");
        }
        const prompt = (options.prompts ?? []).find((p) => p.name === promptName);
        if (!prompt) {
          return rpcError(id, -32602, `Unknown prompt: ${promptName}`);
        }
        const args = (params?.arguments as Record<string, string>) ?? {};
        const text = prompt.handler(args);
        return rpcResponse(id, {
          description: prompt.description,
          messages: [{ role: "user", content: { type: "text", text } }],
        });
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  async function httpHandler(req: Request): Promise<Response> {
    // Only use forwarded headers when explicitly configured — without a trusted
    // proxy in front, X-Forwarded-For is client-controlled and can be spoofed
    // to exhaust other IPs' buckets or bypass per-IP limits entirely.
    const clientIp = options.trustForwardedFor
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown")
      : "unknown";
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
