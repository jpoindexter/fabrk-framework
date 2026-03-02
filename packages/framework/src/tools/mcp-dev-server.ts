import type { ToolDefinition } from "./define-tool";
import { createMCPServer, type MCPServer } from "./mcp/server";

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

export function buildMcpTools(tools: ToolDefinition[]): McpToolDef[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.schema,
    handler: tool.handler,
  }));
}

export function startMcpDevServer(
  tools: ToolDefinition[],
  options?: { name?: string; version?: string }
): MCPServer {
  const server = createMCPServer({
    name: options?.name ?? "fabrk-dev",
    version: options?.version ?? "0.2.0",
    tools,
  });

  return server;
}
