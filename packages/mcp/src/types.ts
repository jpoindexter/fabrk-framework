/**
 * Types for @fabrk/mcp
 */

/** JSON Schema for tool input validation */
export interface JsonSchema {
  type: 'object'
  properties?: Record<string, {
    type: string
    description?: string
    items?: { type: string }
    default?: unknown
    enum?: unknown[]
    minimum?: number
    maximum?: number
  }>
  required?: string[]
}

/** MCP tool definition */
export interface McpToolDefinition {
  /** Tool name (snake_case recommended) */
  name: string
  /** Human-readable description */
  description: string
  /** JSON Schema for input validation */
  inputSchema: JsonSchema
  /** Tool handler function */
  handler: (args: Record<string, unknown>) => Promise<McpToolResult>
}

/** Result returned by a tool handler */
export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

/** MCP resource definition */
export interface McpResourceDefinition {
  /** Resource URI (e.g. 'myapp://resource-name') */
  uri: string
  /** Human-readable name */
  name: string
  /** Description */
  description?: string
  /** MIME type */
  mimeType?: string
  /** Resource reader function */
  reader: () => Promise<string>
}

/** Options for creating an MCP server */
export interface CreateMcpServerOptions {
  /** Server name */
  name: string
  /** Server version */
  version: string
  /** Tool definitions */
  tools?: McpToolDefinition[]
  /** Resource definitions */
  resources?: McpResourceDefinition[]
  /** Called before server starts */
  onStartup?: () => Promise<void>
  /** Called on server error */
  onError?: (error: Error) => void
}

/** Running MCP server instance */
export interface McpServerInstance {
  /** Start the server with stdio transport */
  start: () => Promise<void>
  /** Add a tool after creation */
  addTool: (tool: McpToolDefinition) => void
  /** Add a resource after creation */
  addResource: (resource: McpResourceDefinition) => void
}
