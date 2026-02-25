# AGENTS.md — fabrk (AI-first React framework)

> For AI coding agents. Import paths, public API, and conventions.

## Package: `fabrk`

AI-first React framework built on Vite 7. Adds agents, tools, and prompts as first-class conventions on top of Next.js-compatible routing.

## Public API (`fabrk/fabrk`)

### Agent System

| Export | Type | Description |
|--------|------|-------------|
| `defineAgent(options)` | Function | Define an AI agent in `agents/*/agent.ts` |
| `scanAgents(root)` | Function | Discover agents from filesystem |
| `createAgentHandler(options)` | Function | Create Web Request handler for agent route |
| `createLLMBridge({ model })` | Function | Auto-detect LLM provider from model name |
| `AgentDefinition` | Type | Agent config: model, tools, budget, stream, auth |
| `DefineAgentOptions` | Type | Input options for defineAgent() |
| `AgentBudget` | Type | Budget config: daily, perSession, alertThreshold |
| `ScannedAgent` | Type | Scanner result: name, filePath, routePattern |

### Tool System

| Export | Type | Description |
|--------|------|-------------|
| `defineTool(options)` | Function | Define a tool in `tools/*.ts` |
| `textResult(text)` | Function | Helper to create text tool result |
| `scanTools(root)` | Function | Discover tools from filesystem |
| `ToolDefinition` | Type | Tool config: name, description, schema, handler |
| `ToolResult` | Type | Tool result: content array |
| `ScannedTool` | Type | Scanner result: name, filePath |

### SSE Streaming

| Export | Type | Description |
|--------|------|-------------|
| `formatSSEEvent(event)` | Function | Format event as `data: {...}\n\n` |
| `createSSEStream(generator)` | Function | Create ReadableStream from async generator |
| `createSSEResponse(generator)` | Function | Create Response with SSE headers |
| `parseSSELine(line)` | Function | Parse a single SSE line into event object |
| `SSEEvent` | Type | Union: text, usage, done, error events |

### Prompt System

| Export | Type | Description |
|--------|------|-------------|
| `loadPrompt(root, path)` | Function | Load prompt file, resolve `{{> partial}}` includes |
| `interpolatePrompt(template, vars)` | Function | Replace `{{variable}}` placeholders |

### Configuration

| Export | Type | Description |
|--------|------|-------------|
| `defineFabrkConfig(config)` | Function | Type-safe config helper for `fabrk.config.ts` |
| `loadFabrkConfig(root)` | Function | Load config from project root |
| `FabrkConfig` | Type | Config: ai, auth, security, deploy sections |

### Middleware

| Export | Type | Description |
|--------|------|-------------|
| `createAuthGuard(mode)` | Function | Auth middleware: 'required', 'optional', 'none' |
| `buildSecurityHeaders(config)` | Function | Generate security headers from config |

### Build Utilities

| Export | Type | Description |
|--------|------|-------------|
| `generateAgentsMd(input)` | Function | Generate AGENTS.md from scanned state |
| `AgentsMdInput` | Type | Input: agents, tools, prompts arrays |

## Additional Exports

| Path | Description |
|------|-------------|
| `fabrk/components` | Re-exports `@fabrk/components` (105+ UI components) |
| `fabrk/themes` | Re-exports `@fabrk/design-system` (18 themes) |
| `fabrk/client/use-agent` | `useAgent(name)` React hook with SSE streaming |

## Directory Conventions

```
my-app/
├── fabrk.config.ts         # defineFabrkConfig({ ai, auth, security, deploy })
├── app/                     # Next.js App Router (standard)
├── agents/                  # AI agents (auto-generates /api/agents/*)
│   └── chat/agent.ts       # defineAgent({ model, tools, budget })
├── tools/                   # MCP tools (auto-registered)
│   └── search-docs.ts      # defineTool({ name, schema, handler })
└── prompts/                 # Template files ({{var}} + {{> partial}})
    └── system.md
```

## CLI Commands

```bash
fabrk dev                    # Dev server + MCP server + /__ai dashboard
fabrk build                  # Production build + AGENTS.md generation
fabrk deploy --target workers  # Cloudflare Workers (default)
fabrk deploy --target node     # Node.js standalone
fabrk deploy --target vercel   # Vercel serverless
```

## Usage Patterns

### Define an agent

```typescript
import { defineAgent } from 'fabrk/fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  tools: ['search-docs'],
  budget: { daily: 10 },
  stream: true,
  auth: 'required',
})
```

### Define a tool

```typescript
import { defineTool, textResult } from 'fabrk/fabrk'

export default defineTool({
  name: 'search-docs',
  description: 'Search documentation',
  schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  handler: async ({ query }) => textResult(`Results for: ${query}`),
})
```

### Use agent in React

```tsx
import { useAgent } from 'fabrk/client/use-agent'

const { send, messages, isStreaming, cost } = useAgent('chat')
await send('Hello!')
```

## Test Coverage

66 tests across 15 files: agent scanner, defineAgent, route handler, LLM bridge, SSE streaming, tool scanner, defineTool, MCP bridge, prompt loader, auth guard, security middleware, useAgent parsing, AGENTS.md generation, E2E integration.
