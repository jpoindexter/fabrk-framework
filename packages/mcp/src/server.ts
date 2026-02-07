/**
 * MCP Server factory
 *
 * Creates Model Context Protocol servers with a simple, declarative API.
 * Extracted from patterns across agentsmith, discordmcp, and solo-dev-memory.
 */

import type {
  CreateMcpServerOptions,
  McpServerInstance,
  McpToolDefinition,
  McpToolResult,
  McpResourceDefinition,
} from './types'

/**
 * Create an MCP server with tools and optional resources.
 *
 * @example
 * ```ts
 * import { createMcpServer, defineTool } from '@fabrk/mcp'
 *
 * const server = createMcpServer({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [
 *     defineTool({
 *       name: 'greet',
 *       description: 'Greet a user',
 *       inputSchema: {
 *         type: 'object',
 *         properties: { name: { type: 'string', description: 'Name to greet' } },
 *         required: ['name'],
 *       },
 *       handler: async (args) => ({
 *         content: [{ type: 'text', text: `Hello, ${args.name}!` }],
 *       }),
 *     }),
 *   ],
 * })
 *
 * await server.start()
 * ```
 */
export function createMcpServer(options: CreateMcpServerOptions): McpServerInstance {
  const tools: McpToolDefinition[] = [...(options.tools || [])]
  const resources: McpResourceDefinition[] = [...(options.resources || [])]

  const instance: McpServerInstance = {
    addTool(tool: McpToolDefinition) {
      tools.push(tool)
    },

    addResource(resource: McpResourceDefinition) {
      resources.push(resource)
    },

    async start() {
      // Dynamic import to keep @modelcontextprotocol/sdk as optional peer dep
      let Server: any
      let StdioServerTransport: any
      let ListToolsRequestSchema: any
      let CallToolRequestSchema: any
      let ListResourcesRequestSchema: any
      let ReadResourceRequestSchema: any

      try {
        const serverModule = await import('@modelcontextprotocol/sdk/server/index.js')
        Server = serverModule.Server
        const stdioModule = await import('@modelcontextprotocol/sdk/server/stdio.js')
        StdioServerTransport = stdioModule.StdioServerTransport
        const typesModule = await import('@modelcontextprotocol/sdk/types.js')
        ListToolsRequestSchema = typesModule.ListToolsRequestSchema
        CallToolRequestSchema = typesModule.CallToolRequestSchema
        ListResourcesRequestSchema = typesModule.ListResourcesRequestSchema
        ReadResourceRequestSchema = typesModule.ReadResourceRequestSchema
      } catch {
        throw new Error(
          '@modelcontextprotocol/sdk is not installed. Install with: npm install @modelcontextprotocol/sdk'
        )
      }

      // Create server
      const capabilities: Record<string, Record<string, never>> = { tools: {} }
      if (resources.length > 0) {
        capabilities.resources = {}
      }

      const server = new Server(
        { name: options.name, version: options.version },
        { capabilities }
      )

      // Register tools
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }))

      // Handle tool execution
      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        const { name, arguments: args } = request.params
        const tool = tools.find((t) => t.name === name)

        if (!tool) {
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          }
        }

        try {
          return await tool.handler(args || {})
        } catch (error: any) {
          const message = error instanceof Error ? error.message : String(error)
          if (options.onError) {
            options.onError(error instanceof Error ? error : new Error(message))
          }
          return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
          }
        }
      })

      // Register resources if any
      if (resources.length > 0) {
        server.setRequestHandler(ListResourcesRequestSchema, async () => ({
          resources: resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType || 'text/plain',
          })),
        }))

        server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
          const { uri } = request.params
          const resource = resources.find((r) => r.uri === uri)

          if (!resource) {
            throw new Error(`Unknown resource: ${uri}`)
          }

          const content = await resource.reader()
          return {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType || 'text/plain',
                text: content,
              },
            ],
          }
        })
      }

      // Run startup hook
      if (options.onStartup) {
        await options.onStartup()
      }

      // Start stdio transport
      const transport = new StdioServerTransport()
      await server.connect(transport)
      console.error(`${options.name} MCP server running on stdio`)
    },
  }

  return instance
}
