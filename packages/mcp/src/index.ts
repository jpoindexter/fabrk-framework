/**
 * @fabrk/mcp
 *
 * MCP (Model Context Protocol) server toolkit for the FABRK framework.
 * Build MCP servers with a simple, declarative API.
 *
 * @example
 * ```ts
 * import { createMcpServer, defineTool, textResult, buildSchema } from '@fabrk/mcp'
 *
 * const server = createMcpServer({
 *   name: 'my-app',
 *   version: '1.0.0',
 *   tools: [
 *     defineTool({
 *       name: 'search',
 *       description: 'Search for items',
 *       inputSchema: buildSchema({
 *         query: { type: 'string', description: 'Search query', required: true },
 *         limit: { type: 'number', description: 'Max results' },
 *       }),
 *       handler: async (args) => {
 *         const results = await search(args.query as string)
 *         return textResult(JSON.stringify(results))
 *       },
 *     }),
 *   ],
 * })
 *
 * await server.start()
 * ```
 */

// Server
export { createMcpServer } from './server'

// Helpers
export {
  defineTool,
  textResult,
  jsonResult,
  errorResult,
  buildSchema,
  parseArgs,
} from './helpers'

// Types
export type {
  CreateMcpServerOptions,
  McpServerInstance,
  McpToolDefinition,
  McpToolResult,
  McpResourceDefinition,
  JsonSchema,
} from './types'
