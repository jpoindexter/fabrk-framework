import type { ToolDefinition } from "../define-tool";
import { buildSecurityHeaders } from "../../middleware/security";
import {
  isJsonRpc, rpcError, rpcResponse,
  handleInitialize, handleToolsList, handleToolsCall,
  handleResourcesList, handleResourcesRead,
  handlePromptsList, handlePromptsGet,
} from "./server-handlers";
import { RateLimiter, DEFAULT_RATE_LIMIT, handleHttpBody } from "./server-http";

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

export function createMCPServer(options: {
  name: string;
  version: string;
  tools: ToolDefinition[];
  resources?: MCPResource[];
  prompts?: MCPPromptDef[];
  rateLimit?: number;
  rateLimitWindowMs?: number;
  trustForwardedFor?: boolean;
}): MCPServer {
  const toolMap = new Map(options.tools.map((t) => [t.name, t]));
  const limiter = new RateLimiter(options.rateLimit, options.rateLimitWindowMs);

  async function handleRequest(jsonRpc: unknown): Promise<unknown> {
    if (!isJsonRpc(jsonRpc)) return rpcError(undefined, -32600, "Invalid JSON-RPC request");

    const { id, method, params } = jsonRpc;
    switch (method) {
      case "initialize":
        return handleInitialize(id, options.name, options.version, options.resources, options.prompts);
      case "ping":
        return rpcResponse(id, {});
      case "notifications/initialized":
        return undefined;
      case "tools/list":
        return handleToolsList(id, options.tools);
      case "tools/call":
        return handleToolsCall(id, params, toolMap);
      case "resources/list":
        return handleResourcesList(id, options.resources ?? []);
      case "resources/read":
        return handleResourcesRead(id, params, options.resources ?? []);
      case "prompts/list":
        return handlePromptsList(id, options.prompts ?? []);
      case "prompts/get":
        return handlePromptsGet(id, params, options.prompts ?? []);
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  async function httpHandler(req: Request): Promise<Response> {
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

    return handleHttpBody(req, handleRequest);
  }

  return { name: options.name, version: options.version, handleRequest, httpHandler };
}
