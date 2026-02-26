export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export function defineTool(options: ToolDefinition): ToolDefinition {
  return options;
}

export function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}
