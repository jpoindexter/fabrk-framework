import type { ToolExecutorHooks } from "../agents/tool-executor";

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image";
  data: string; // base64-encoded
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
}

export interface FilePart {
  type: "file";
  name: string;
  data: string; // base64-encoded
  mediaType: string;
}

export type ToolOutputPart = TextPart | ImagePart | FilePart;

export interface ToolResult {
  content: Array<ToolOutputPart>;
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
  hooks?: ToolExecutorHooks;
  requiresApproval?: boolean;
}

export function defineTool(options: ToolDefinition): ToolDefinition {
  return options;
}

export function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}
