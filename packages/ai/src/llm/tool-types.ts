export interface LLMToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMToolResult {
  content: string | null;
  toolCalls?: LLMToolCall[];
  usage: { promptTokens: number; completionTokens: number };
}

export type LLMTextPart = { type: "text"; text: string };
export type LLMImagePart = { type: "image"; url?: string; base64?: string; mimeType?: string };
export type LLMContentPart = LLMTextPart | LLMImagePart;

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LLMContentPart[];
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
}

export type LLMStreamEvent =
  | { type: "text-delta"; content: string }
  | { type: "tool-call"; id: string; name: string; arguments: Record<string, unknown> }
  | { type: "usage"; promptTokens: number; completionTokens: number };

export type ToolChoiceValue =
  | "auto"
  | "none"
  | "required"
  | { type: "tool"; toolName: string };

export interface GenerationOptions {
  toolChoice?: ToolChoiceValue;
  topP?: number;
  stop?: string | string[];
}
