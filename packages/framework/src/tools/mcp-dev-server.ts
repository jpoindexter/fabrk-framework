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
 * Uses @fabrk/mcp's createMcpServer under the hood.
 */
export async function startMcpDevServer(
  tools: ToolDefinition[],
  options?: { name?: string; version?: string }
) {
  const { createMcpServer } = await import("@fabrk/mcp");
  const mcpTools = buildMcpTools(tools);

  const server = createMcpServer({
    name: options?.name ?? "fabrk-dev",
    version: options?.version ?? "0.0.0",
    tools: mcpTools as any,
  });

  await server.start();
  return server;
}
