# @fabrk/framework

**AI-first full-stack framework — own Vite 7 runtime with file-system routing, SSR, streaming, and middleware.**

[![npm](https://img.shields.io/npm/v/@fabrk/framework)](https://www.npmjs.com/package/@fabrk/framework)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

@fabrk/framework provides its own Vite 7 runtime (file-system routing, SSR with streaming, middleware, metadata) plus AI agents, tools, MCP, 109+ components, and 18 themes.

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
pnpm install
pnpm dev
```

## What You Get

| Runtime | Batteries |
|---------|-----------|
| Vite 7 plugin | AI agents (`defineAgent()`) |
| File-system routing | Tools (`defineTool()`) + MCP |
| SSR with streaming | 109+ UI components |
| Layout nesting | 18 themes + design system |
| Middleware | Auth (NextAuth, MFA, API keys) |
| Metadata injection | Payments (Stripe, Polar, Lemon) |
| CLI (dev/build/start) | Security (CSRF, CSP, rate limiting) |
| Generic fetch handler | Email, storage, cost tracking |

## File Conventions

```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── middleware.ts        # Runs before route matching
├── page.tsx            # Route: /
├── about/
│   └── page.tsx        # Route: /about
├── blog/
│   ├── page.tsx        # Route: /blog
│   └── [slug]/
│       └── page.tsx    # Route: /blog/:slug
└── api/
    └── hello/
        └── route.ts    # API: /api/hello (GET/POST/etc)
```

- `page.tsx` — Page component (default export)
- `layout.tsx` — Wrapping layout (receives `children`)
- `route.ts` — API route (exports named HTTP method handlers: `GET`, `POST`, etc.)
- `middleware.ts` — Runs before routing; return `Response` to short-circuit, `undefined` to continue
- `[param]` — Dynamic segments (extracted as `params.param`)

## Usage

### Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import fabrk from '@fabrk/framework'

export default defineConfig({
  plugins: [...fabrk()]
})
```

### Page with Metadata

```typescript
// app/page.tsx
export const metadata = { title: 'Home', description: 'Welcome' }

export default function Home() {
  return <h1>Hello, World!</h1>
}
```

### API Route

```typescript
// app/api/hello/route.ts
export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: 'hello' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request, { params }: { params: Record<string, string> }) {
  const body = await request.json()
  return new Response(JSON.stringify({ received: body }))
}
```

### Middleware

```typescript
// app/middleware.ts
export default function middleware(request: Request) {
  if (!request.headers.get('Authorization')) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Return undefined to continue to route handler
}
```

### AI Agents

```typescript
// agents/chat/agent.ts
import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  tools: ['search-docs'],
  systemPrompt: 'You are a helpful assistant.',
})
```

### Tools

```typescript
// tools/search-docs.ts
import { defineTool, textResult } from '@fabrk/framework'

export default defineTool({
  name: 'search-docs',
  description: 'Search documentation',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  handler: async (input) => textResult(`Results for: ${input.query}`),
})
```

### CLI

```bash
fabrk dev        # Vite dev server + AI agents + MCP tools
fabrk build      # Production build + AGENTS.md generation
fabrk start      # Start production server
fabrk info       # Show agents, tools, prompts
```

## Exports

| Import | Purpose |
|--------|---------|
| `@fabrk/framework` | Default: Vite plugin. Named: `defineAgent`, `defineTool`, `scanRoutes`, `handleRequest` |
| `@fabrk/framework/fabrk` | Full API: agents, tools, SSE, budget, config, middleware, prompts |
| `@fabrk/framework/client/use-agent` | `useAgent()` React hook for client-side agent interaction |
| `@fabrk/framework/components` | Re-exports `@fabrk/components` |
| `@fabrk/framework/themes` | Re-exports `@fabrk/design-system` |
| `@fabrk/framework/worker` | `createFetchHandler()` for Cloudflare Workers / edge runtimes |

## Architecture

```
@fabrk/framework runtime          @fabrk/* packages
  Vite 7 plugin (fabrkPlugin)        @fabrk/components (109+ UI)
  File-system router (scanRoutes)    @fabrk/ai (LLM, cost tracking)
  SSR handler (handleRequest)        @fabrk/auth (NextAuth, MFA)
  Streaming + metadata               @fabrk/payments (Stripe, Polar)
  Middleware pipeline                 @fabrk/design-system (18 themes)
  Node ↔ Web bridge                  ... 6 more packages
  Generic fetch handler
         |
    +------------------+
    | @fabrk/framework |  ← runtime + batteries
    +------------------+
```

## License

MIT
