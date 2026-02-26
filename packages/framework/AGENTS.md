# AGENTS.md — fabrk (framework package)

> For AI coding agents (Claude Code, Cursor, Copilot, v0.dev)

## What This Package Is

`fabrk` is the meta-package that composes [vinext](https://github.com/cloudflare/vinext) (Cloudflare's Vite 7 + Next.js API) with fabrk's AI agents, tools, components, auth, payments, and design system.

## Entry Points

| Import | Purpose |
|--------|---------|
| `fabrk` | Vite plugin (default export) |
| `fabrk/fabrk` | Full public API (agents, tools, prompts, middleware, config) |
| `fabrk/agents` | `defineAgent()` |
| `fabrk/tools` | `defineTool()`, `textResult()` |
| `fabrk/client` | `useAgent()` React hook |
| `fabrk/components` | Re-exports @fabrk/components |
| `fabrk/themes` | Re-exports @fabrk/design-system |

## Agent System

### defineAgent(options)

Define an AI agent with model, tools, auth, and budget:

```typescript
import { defineAgent } from 'fabrk/agents'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  tools: ['search-docs'],
  auth: 'required',
  budget: { maxCostPerRequest: 0.05, dailyLimit: 10.0 },
  systemPrompt: 'You are a helpful assistant.',
})
```

### createAgentHandler(options)

Creates a Web Request handler for an agent endpoint:

```typescript
import { createAgentHandler } from 'fabrk/fabrk'

const handler = createAgentHandler({ ...agentDef })
// handler(request: Request) => Promise<Response>
```

### SSE Streaming

```typescript
import { createSSEResponse, formatSSEEvent } from 'fabrk/fabrk'

const response = createSSEResponse(async function* () {
  yield formatSSEEvent({ type: 'text', content: 'Hello' })
  yield formatSSEEvent({ type: 'done' })
})
```

## Tool System

### defineTool(options)

```typescript
import { defineTool, textResult } from 'fabrk/tools'

export default defineTool({
  name: 'search-docs',
  description: 'Search documentation',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  handler: async (input) => textResult(`Found: ${input.query}`),
})
```

## CLI Commands

| Command | What It Does |
|---------|-------------|
| `fabrk dev` | vinext dev + MCP server + agent scanning |
| `fabrk build` | vinext build + AGENTS.md generation |
| `fabrk deploy` | Deploy to Cloudflare Workers (vinext) |
| `fabrk start` | Start production server (vinext) |
| `fabrk info` | Show agents, tools, prompts |

## Client Hook

```typescript
import { useAgent } from 'fabrk/client'

function Chat() {
  const { messages, send, isStreaming } = useAgent('/api/agents/chat')
  // ...
}
```

## Middleware

```typescript
import { createAuthGuard, buildSecurityHeaders } from 'fabrk/fabrk'

const guard = createAuthGuard({ required: true })
const headers = buildSecurityHeaders()
```

## Config

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from 'fabrk/fabrk'

export default defineFabrkConfig({
  ai: { defaultModel: 'claude-sonnet-4-5-20250514', costTracking: true },
})
```
