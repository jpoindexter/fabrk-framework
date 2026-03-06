import type { ToolDefinition } from "../define-tool";

export class MCPClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MCPClientError";
  }
}

export interface MCPConnection {
  tools: ToolDefinition[];
  disconnect: () => Promise<void>;
  listResources: () => Promise<Array<{ uri: string; name: string; description?: string; mimeType?: string }>>;
  readResource: (uri: string) => Promise<string>;
  listPrompts: () => Promise<Array<{ name: string; description?: string }>>;
  getPrompt: (name: string, args?: Record<string, string>) => Promise<string>;
}

export interface MCPClientOptions {
  url?: string;
  command?: string;
  args?: string[];
  transport: "http" | "stdio";
  timeout?: number;
  /**
   * Allow the MCP server URL to be a localhost/loopback address.
   * Defaults to `false` (localhost blocked) to prevent SSRF in production.
   * Set to `true` only for local development MCP servers.
   */
  allowLocalhost?: boolean;
  auth?:
    | { type: "bearer"; token: string }
    | { type: "oauth2"; clientId: string; clientSecret?: string; tokenUrl: string; scopes?: string[] };
  elicitation?: (prompt: string, schema: Record<string, unknown>) => Promise<unknown>;
}
