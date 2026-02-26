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
  options?: { name?: string }
) {
  const mcpTools = buildMcpTools(tools);

  console.log(
    `  [fabrk] MCP tools available: ${mcpTools.map((t) => t.name).join(", ")}`
  );

  return { tools: mcpTools, name: options?.name ?? "fabrk-dev" };
}
