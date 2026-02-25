# fabrk

The React framework where AI agents are as native as pages and API routes.

Built on [Vite 7](https://vite.dev) with full Next.js App Router compatibility. Fork of [vinext](https://github.com/cloudflare/vinext) (MIT).

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
fabrk dev
```

## AI-Native Conventions

### Agents (`agents/`)

Define AI agents with file-system conventions:

```typescript
// agents/chat/agent.ts
import { defineAgent } from 'fabrk/fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  fallback: ['gpt-4o'],
  systemPrompt: './prompts/system.md',
  tools: ['search-docs'],
  budget: { daily: 10, perSession: 0.50 },
  stream: true,
  auth: 'required',
})
```

The framework auto-generates:
- **API route** at `POST /api/agents/chat` with SSE streaming
- **Auth middleware** when `auth: 'required'`
- **Cost tracking** on every call
- **React hook** via `useAgent('chat')`

### Tools (`tools/`)

Define MCP-compatible tools:

```typescript
// tools/search-docs.ts
import { defineTool, textResult } from 'fabrk/fabrk'

export default defineTool({
  name: 'search-docs',
  description: 'Search documentation',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  async handler({ query }) {
    const results = await search(query as string)
    return textResult(JSON.stringify(results))
  },
})
```

Tools are auto-registered with agents and exposed via MCP in dev mode.

### Prompts (`prompts/`)

File-system prompt templates with interpolation:

```markdown
<!-- prompts/system.md -->
You are a {{role}} assistant.

{{> partials/rules.md}}
```

- `{{variable}}` — runtime interpolation
- `{{> path}}` — partial includes (recursive)
- Hot-reload in dev mode

## React Hook

```tsx
import { useAgent } from 'fabrk/client/use-agent'

function Chat() {
  const { send, messages, isStreaming, cost, error } = useAgent('chat')

  return (
    <div>
      {messages.map((m, i) => <p key={i}>{m.content}</p>)}
      <button onClick={() => send('Hello!')}>Send</button>
    </div>
  )
}
```

## CLI

```bash
fabrk dev                      # Dev server + MCP server + /__ai dashboard
fabrk build                    # Production build + AGENTS.md generation
fabrk deploy                   # Deploy to Cloudflare Workers (default)
fabrk deploy --target node     # Node.js standalone server
fabrk deploy --target vercel   # Vercel serverless
```

## Dev Dashboard

Visit `http://localhost:3000/__ai` during development to see:
- Registered agents and tools
- Live cost tracking
- Recent call history with model/tokens/cost

## Built-in Runtime

All `@fabrk/*` packages are included:

| Import | Package |
|--------|---------|
| `fabrk/components` | `@fabrk/components` — 105+ UI components |
| `fabrk/themes` | `@fabrk/design-system` — 18 themes |
| `fabrk/client/use-agent` | React hook for agent interaction |
| `fabrk/fabrk` | Public API (defineAgent, defineTool, loadPrompt, etc.) |

## Configuration

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from 'fabrk/fabrk'

export default defineFabrkConfig({
  ai: {
    defaultModel: 'claude-sonnet-4-5-20250514',
    budget: { daily: 50 },
  },
  auth: { provider: 'nextauth', apiKeys: true },
  security: { csrf: true, csp: true, rateLimit: { windowMs: 60000, max: 100 } },
  deploy: { target: 'vercel' },
})
```

## Testing

```bash
cd packages/framework
pnpm test          # 66 tests across 15 files
pnpm build         # TypeScript compilation
```

## License

MIT
