import type { ToolDefinition } from "../define-tool";
import type { MCPResource, MCPPromptDef } from "./server";

const JSONRPC_VERSION = "2.0";
const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export function isJsonRpc(data: unknown): data is JsonRpcRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).jsonrpc === JSONRPC_VERSION &&
    typeof (data as Record<string, unknown>).method === "string"
  );
}

export function rpcResponse(id: string | number | undefined, result: unknown): unknown {
  return { jsonrpc: JSONRPC_VERSION, id: id ?? null, result };
}

export function rpcError(id: string | number | undefined, code: number, message: string): unknown {
  return { jsonrpc: JSONRPC_VERSION, id: id ?? null, error: { code, message } };
}

export function handleInitialize(
  id: string | number | undefined,
  serverName: string,
  serverVersion: string,
  resources?: MCPResource[],
  prompts?: MCPPromptDef[]
): unknown {
  return rpcResponse(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      ...(resources?.length ? { resources: {} } : {}),
      ...(prompts?.length ? { prompts: {} } : {}),
    },
    serverInfo: { name: serverName, version: serverVersion },
  });
}

export function handleToolsList(id: string | number | undefined, tools: ToolDefinition[]): unknown {
  return rpcResponse(id, {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.schema,
    })),
  });
}

export async function handleToolsCall(
  id: string | number | undefined,
  params: Record<string, unknown> | undefined,
  toolMap: Map<string, ToolDefinition>
): Promise<unknown> {
  const toolName = params?.name;
  if (typeof toolName !== "string") return rpcError(id, -32602, "Missing tool name");

  const tool = toolMap.get(toolName);
  if (!tool) return rpcError(id, -32602, `Unknown tool: ${toolName}`);

  try {
    const args = (params?.arguments as Record<string, unknown>) ?? {};
    const result = await tool.handler(args);
    return rpcResponse(id, { content: result.content });
  } catch (err) {
    console.error(`[fabrk] MCP tool "${toolName}" error:`, err);
    return rpcResponse(id, { content: [{ type: "text", text: "Error: Tool execution failed" }], isError: true });
  }
}

export function handleResourcesList(id: string | number | undefined, resources: MCPResource[]): unknown {
  return rpcResponse(id, {
    resources: resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
  });
}

export async function handleResourcesRead(
  id: string | number | undefined,
  params: Record<string, unknown> | undefined,
  resources: MCPResource[]
): Promise<unknown> {
  const uri = params?.uri;
  if (typeof uri !== "string") return rpcError(id, -32602, "Missing resource uri");

  const resource = resources.find((r) => r.uri === uri);
  if (!resource) return rpcError(id, -32602, `Unknown resource: ${uri}`);

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

export function handlePromptsList(id: string | number | undefined, prompts: MCPPromptDef[]): unknown {
  return rpcResponse(id, {
    prompts: prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  });
}

export function handlePromptsGet(
  id: string | number | undefined,
  params: Record<string, unknown> | undefined,
  prompts: MCPPromptDef[]
): unknown {
  const promptName = params?.name;
  if (typeof promptName !== "string") return rpcError(id, -32602, "Missing prompt name");

  const prompt = prompts.find((p) => p.name === promptName);
  if (!prompt) return rpcError(id, -32602, `Unknown prompt: ${promptName}`);

  const args = (params?.arguments as Record<string, string>) ?? {};
  const text = prompt.handler(args);
  return rpcResponse(id, {
    description: prompt.description,
    messages: [{ role: "user", content: { type: "text", text } }],
  });
}
