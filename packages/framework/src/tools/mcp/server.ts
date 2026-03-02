import type { ToolDefinition } from "../define-tool";
import { buildSecurityHeaders } from "../../middleware/security";

const JSONRPC_VERSION = "2.0";
const PROTOCOL_VERSION = "2024-11-05";

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
}): MCPServer {
  const toolMap = new Map(options.tools.map((t) => [t.name, t]));

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

  const MAX_REQUEST_BYTES = 1024 * 1024; // 1 MB

  async function httpHandler(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return new Response(JSON.stringify(rpcError(undefined, -32600, "POST required")), {
        status: 405,
        headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
      });
    }

    // Validate Content-Length if present
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
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  }

  return { name: options.name, version: options.version, handleRequest, httpHandler };
}
