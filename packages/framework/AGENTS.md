# AGENTS.md — @fabrk/framework

> For AI coding agents (Claude Code, Cursor, Copilot, v0.dev)

## What This Package Is

`@fabrk/framework` is the full-stack framework package — own Vite 7 runtime (file-system routing, SSR with streaming, middleware, metadata injection) with AI agents, tools, components, auth, payments, and design system.

## Entry Points

| Import | Purpose |
|--------|---------|
| `@fabrk/framework` | Default: Vite plugin. Named: `defineAgent`, `defineTool`, `scanRoutes`, `matchRoute`, `handleRequest` |
| `@fabrk/framework/fabrk` | Full API (agents, tools, SSE, budget, config, middleware, prompts) |
| `@fabrk/framework/client/use-agent` | `useAgent()` React hook, `parseSSELine()` |
| `@fabrk/framework/components` | Re-exports `@fabrk/components` |
| `@fabrk/framework/themes` | Re-exports `@fabrk/design-system` |
| `@fabrk/framework/worker` | `createFetchHandler()` for edge runtimes |

## File Conventions

```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── middleware.ts        # Runs before route matching
├── page.tsx            # Route: /
├── about/
│   └── page.tsx        # Route: /about
├── blog/
│   └── [slug]/
│       └── page.tsx    # Route: /blog/:slug
└── api/
    └── hello/
        └── route.ts    # API: /api/hello (GET/POST/etc)
```

- `page.tsx` = page component (default export)
- `layout.tsx` = wrapping layout (receives `children`, nests automatically)
- `route.ts` = API route (export `GET`, `POST`, `PUT`, `DELETE`, etc.)
- `middleware.ts` = runs before routing; return `Response` to short-circuit
- `[param]` = dynamic segments → `params.param`
- `export const metadata = { title, description }` on pages → injected into `<head>`

## Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import fabrk from '@fabrk/framework'

export default defineConfig({
  plugins: [...fabrk()]
})
```

The `fabrk()` default export returns an array of Vite plugins:
- `fabrk:router` — file-system routing + SSR middleware
- `fabrk:virtual-entries` — virtual modules for client/SSR/RSC entries
- `fabrk:rsc-integration` — optional RSC via `@vitejs/plugin-rsc`
- `fabrk:agents` — agent scanning + SSE endpoints
- `fabrk:dashboard` — `/__ai` dev dashboard

## Agent System

### defineAgent(options)

```typescript
import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  tools: ['search-docs'],
  auth: 'required',
  budget: { daily: 10.0, perSession: 0.50 },
  systemPrompt: 'You are a helpful assistant.',
})
```

### createAgentHandler(options)

```typescript
import { createAgentHandler } from '@fabrk/framework/fabrk'

const handler = createAgentHandler({
  model: 'claude-sonnet-4-5-20250514',
  tools: [],
  stream: true,
  auth: 'required',
  budget: { daily: 10.0 },
})
// handler(request: Request) => Promise<Response>
```

### SSE Streaming

```typescript
import { createSSEResponse, formatSSEEvent } from '@fabrk/framework/fabrk'

const response = createSSEResponse(async function* () {
  yield { type: 'text', content: 'Hello' }
  yield { type: 'done' }
})
```

## Tool System

### defineTool(options)

```typescript
import { defineTool, textResult } from '@fabrk/framework'

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
| `fabrk dev` | Vite dev server + MCP tools + agent scanning |
| `fabrk build` | Production build + AGENTS.md generation |
| `fabrk start` | Start production server |
| `fabrk info` | Show agents, tools, prompts |

## Client Hook

```typescript
import { useAgent } from '@fabrk/framework/client/use-agent'

function Chat() {
  const { messages, send, isStreaming, cost, error } = useAgent('chat')
}
```

## Middleware

```typescript
import { createAuthGuard, buildSecurityHeaders } from '@fabrk/framework/fabrk'

const guard = createAuthGuard('required')
const headers = buildSecurityHeaders()
```

## Config

```typescript
import { defineFabrkConfig } from '@fabrk/framework/fabrk'

export default defineFabrkConfig({
  ai: { defaultModel: 'claude-sonnet-4-5-20250514' },
  security: { csrf: true, csp: true },
})
```

## Runtime Exports

```typescript
import { scanRoutes, matchRoute, handleRequest } from '@fabrk/framework'
import { nodeToWebRequest, writeWebResponse } from '@fabrk/framework'
import { createFetchHandler } from '@fabrk/framework/worker'
```

## Security

- Path traversal protection on prompt loading
- Error internals never leaked to HTTP clients
- Request body size capped at 1 MB
- Session cost map capped at 10,000 entries
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) on all responses
