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

export interface DefineToolOptions {
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export function defineTool(options: DefineToolOptions): ToolDefinition {
  return {
    name: options.name,
    description: options.description,
    schema: options.schema,
    handler: options.handler,
  };
}

export function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}
