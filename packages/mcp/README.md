# @fabrk/mcp

Model Context Protocol (MCP) server toolkit for the FABRK framework. Build MCP servers with a simple, declarative API.

## Installation

```bash
npm install @fabrk/mcp
```

## Usage

```tsx
import { createMcpServer, defineTool, textResult, buildSchema } from '@fabrk/mcp'

const server = createMcpServer({
  name: 'my-app',
  version: '1.0.0',
  tools: [
    defineTool({
      name: 'search',
      description: 'Search for items',
      inputSchema: buildSchema({
        query: { type: 'string', description: 'Search query', required: true },
        limit: { type: 'number', description: 'Max results' },
      }),
      handler: async (args) => {
        const results = await search(args.query as string)
        return textResult(JSON.stringify(results))
      },
    }),
  ],
})

await server.start()
```

### Result Helpers

```tsx
import { textResult, jsonResult, errorResult } from '@fabrk/mcp'

// Plain text
return textResult('Operation complete')

// JSON (auto-stringified with formatting)
return jsonResult({ count: 42, items: ['a', 'b'] })

// Error
return errorResult('Item not found')
```

### Schema Builder

Reduce boilerplate when defining tool input schemas:

```tsx
import { buildSchema } from '@fabrk/mcp'

const schema = buildSchema({
  name: { type: 'string', description: 'User name', required: true },
  limit: { type: 'number', description: 'Max results', default: 10 },
  tags: { type: 'array', description: 'Filter tags', items: { type: 'string' } },
  status: { type: 'string', enum: ['active', 'archived'] },
})
```

### Zod Argument Parsing

Validate tool arguments with a Zod schema:

```tsx
import { parseArgs, textResult } from '@fabrk/mcp'
import { z } from 'zod'

const InputSchema = z.object({ name: z.string(), age: z.number().optional() })

handler: async (args) => {
  const { name, age } = parseArgs(args, InputSchema)
  return textResult(`Hello, ${name}!`)
}
```

### Resources

Expose read-only data sources alongside tools:

```tsx
const server = createMcpServer({
  name: 'my-app',
  version: '1.0.0',
  tools: [/* ... */],
  resources: [
    {
      uri: 'myapp://config',
      name: 'App Configuration',
      description: 'Current application config',
      mimeType: 'application/json',
      reader: async () => JSON.stringify(config),
    },
  ],
})
```

### Dynamic Registration

Add tools and resources after server creation:

```tsx
const server = createMcpServer({ name: 'my-app', version: '1.0.0' })

server.addTool(defineTool({
  name: 'ping',
  description: 'Health check',
  inputSchema: { type: 'object', properties: {} },
  handler: async () => textResult('pong'),
}))

server.addResource({
  uri: 'myapp://status',
  name: 'Server Status',
  reader: async () => 'running',
})

await server.start()
```

## Features

- **Declarative Server Creation** - `createMcpServer` sets up tools, resources, and lifecycle hooks in a single call
- **Tool Definition** - `defineTool` provides a typed wrapper for defining MCP tools with input schemas and handlers
- **Result Helpers** - `textResult`, `jsonResult`, and `errorResult` simplify building tool responses
- **Schema Builder** - `buildSchema` converts a simple field map into JSON Schema, reducing boilerplate for common patterns
- **Zod Integration** - `parseArgs` validates tool arguments against a Zod schema with formatted error messages
- **Resource Support** - Expose read-only resources with custom URI schemes and MIME types
- **Dynamic Registration** - Add tools and resources after creation with `addTool` and `addResource`
- **Lifecycle Hooks** - `onStartup` for initialization and `onError` for centralized error handling
- **Optional Peer Dependency** - `@modelcontextprotocol/sdk` is dynamically imported so it remains an optional install

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
