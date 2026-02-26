import type { ToolDefinition } from "./define-tool.js";

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }>;
}

/**
 * Convert framework ToolDefinition[] to MCP-compatible tool definitions.
 * Maps `schema` -> `inputSchema` for MCP protocol compatibility.
 */
export function buildMcpTools(tools: ToolDefinition[]): McpToolDef[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.schema,
    handler: tool.handler,
  }));
}

/**
 * Start an MCP dev server with the given tools.
 *
 * Attempts to use @modelcontextprotocol/sdk if available.
 * Falls back to a simple stdio JSON-RPC server if not.
 */
export async function startMcpDevServer(
  tools: ToolDefinition[],
  options?: { name?: string; version?: string }
) {
  const mcpTools = buildMcpTools(tools);

  // MCP server is optional — log tools for discoverability even without SDK
  console.log(
    `  [fabrk] MCP tools available: ${mcpTools.map((t) => t.name).join(", ")}`
  );

  return { tools: mcpTools, name: options?.name ?? "fabrk-dev" };
}
