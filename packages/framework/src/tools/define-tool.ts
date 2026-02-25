export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolDefinition {
  /** Tool name (must match filename in tools/) */
  name: string;
  /** Human-readable description for the LLM */
  description: string;
  /** JSON Schema for the tool's input parameters */
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Handler function that executes the tool */
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

/**
 * Define a tool. Used in tools/*.ts files.
 */
export function defineTool(options: DefineToolOptions): ToolDefinition {
  return {
    name: options.name,
    description: options.description,
    schema: options.schema,
    handler: options.handler,
  };
}

/**
 * Helper to create a text result for tool responses.
 */
export function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}
