/**
 * Helper functions for building MCP tools
 */

import type { McpToolDefinition, McpToolResult, JsonSchema } from './types'

/**
 * Define a typed MCP tool. Convenience wrapper for type safety.
 *
 * @example
 * ```ts
 * const greetTool = defineTool({
 *   name: 'greet',
 *   description: 'Greet a user by name',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       name: { type: 'string', description: 'Name to greet' },
 *     },
 *     required: ['name'],
 *   },
 *   handler: async (args) => textResult(`Hello, ${args.name}!`),
 * })
 * ```
 */
export function defineTool(tool: McpToolDefinition): McpToolDefinition {
  return tool
}

/**
 * Create a text result (most common return type)
 */
export function textResult(text: string): McpToolResult {
  return {
    content: [{ type: 'text', text }],
  }
}

/**
 * Create a JSON result (auto-stringified)
 */
export function jsonResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

/**
 * Create an error result
 */
export function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  }
}

/**
 * Build JSON Schema for tool input from a simple field map.
 * Reduces boilerplate for common tool patterns.
 *
 * @example
 * ```ts
 * const schema = buildSchema({
 *   name: { type: 'string', description: 'User name', required: true },
 *   limit: { type: 'number', description: 'Max results', default: 10 },
 * })
 * ```
 */
export function buildSchema(
  fields: Record<
    string,
    {
      type: string
      description?: string
      required?: boolean
      default?: unknown
      items?: { type: string }
      enum?: unknown[]
    }
  >
): JsonSchema {
  const properties: JsonSchema['properties'] = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(fields)) {
    const { required: isRequired, ...rest } = field
    properties[key] = rest
    if (isRequired) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

/**
 * Parse and validate tool arguments with a Zod schema.
 * Returns parsed data or throws with formatted error.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 *
 * const MySchema = z.object({ name: z.string() })
 *
 * handler: async (args) => {
 *   const { name } = parseArgs(args, MySchema)
 *   return textResult(`Hello, ${name}!`)
 * }
 * ```
 */
export function parseArgs<T>(args: Record<string, unknown>, schema: { parse: (_data: unknown) => T }): T {
  try {
    return schema.parse(args)
  } catch (error: any) {
    if (error?.issues) {
      // Zod-style error
      const messages = error.issues.map(
        (e: { path: string[]; message: string }) => `${e.path.join('.')}: ${e.message}`
      )
      throw new Error(`Invalid arguments: ${messages.join(', ')}`)
    }
    throw error
  }
}
