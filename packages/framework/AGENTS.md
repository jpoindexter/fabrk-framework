# AGENTS.md — @fabrk/framework

> For AI coding agents (Claude Code, Cursor, Copilot, v0.dev)

## What This Package Is

`@fabrk/framework` is the full-stack framework package — own Vite 7 runtime (file-system routing, SSR with streaming, middleware, metadata injection) with AI agents, tools, testing utilities, built-in tools, orchestration, skills, MCP, and a developer dashboard.

## Entry Points

| Import | Purpose |
|--------|---------|
| `@fabrk/framework` | Default: Vite plugin. Named: `defineAgent`, `defineTool`, `scanRoutes`, `matchRoute`, `handleRequest`, testing helpers, built-in tools |
| `@fabrk/framework/fabrk` | Full API (agents, tools, SSE, budget, config, middleware, prompts, dashboard) |
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
  model: 'claude-sonnet-4-6',
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
  model: 'claude-sonnet-4-6',
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

### Built-in Tools

#### sqlQueryTool(options)

SQL query tool for agents. Accepts any database driver via an injected `query` function. Read-only by default; blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.

```typescript
import { sqlQueryTool } from '@fabrk/framework'

const tool = sqlQueryTool({
  query: async (sql, params) => db.query(sql, params),  // your driver here
  allowWrite: false,   // default: read-only
  timeoutMs: 5000,     // default: 5000 ms
  maxRows: 100,        // default: 100 rows
  maxResultBytes: 100_000,  // default: 100 KB
})
```

Options:
- `query` (required) — `(sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>`
- `allowWrite` — allow INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE (default: `false`)
- `timeoutMs` — abort query after N ms (default: `5000`)
- `maxRows` — truncate result to at most N rows (default: `100`)
- `maxResultBytes` — truncate serialized result to at most N bytes (default: `100000`)

Results are returned as a GitHub-flavoured markdown table. Truncation notices are appended when limits are hit. All errors return a safe generic message; internal details are logged server-side only.

#### ragTool(options)

RAG (Retrieval-Augmented Generation) search tool. Pluggable vector store via an injected `search` function.

```typescript
import { ragTool } from '@fabrk/framework'
import type { RagResult } from '@fabrk/framework'

const tool = ragTool({
  search: async (query, topK) => vectorStore.search(query, topK),
  name: 'knowledge-search',           // default
  description: 'Search the knowledge base for relevant information.',  // default
  topK: 5,                            // default: 5 results
  minScore: 0.7,                      // filter results below this score
  formatResult: (results, query) => results.map(r => r.content).join('\n'),
})
```

Options:
- `search` (required) — `(query: string, topK: number) => Promise<RagResult[]>`
- `name` — tool name exposed to the LLM (default: `"knowledge-search"`)
- `description` — tool description (default: `"Search the knowledge base for relevant information."`)
- `topK` — default number of results (default: `5`)
- `minScore` — exclude results with score below this threshold; results without a score always pass through (default: `0.0`)
- `formatResult` — custom formatter `(results: RagResult[], query: string) => string`

`RagResult` type:
```typescript
interface RagResult {
  content: string
  score?: number
  metadata?: Record<string, unknown>
}
```

Default formatting: numbered `[1] content`, optional `score:` line, optional `metadata keys:` line.

## Testing Framework

All exports available from `@fabrk/framework`:

```typescript
import {
  mockLLM, MockLLM, createTestAgent,
  calledTool, calledToolWith, respondedWith,
  costUnder, iterationsUnder, getToolCalls,
} from '@fabrk/framework'
```

### mockLLM()

Creates a new `MockLLM` builder instance. Use the fluent API to configure expected message patterns and responses.

```typescript
const mock = mockLLM()
  .onMessage('search').callTool('web-search', { query: 'cats' })
  .onMessage(/\d+ items/).respondWith('Counted items')
  .setDefault('Mock response')
```

#### MockLLM methods

| Method | Description |
|--------|-------------|
| `.onMessage(pattern)` | Match last user message by string substring or RegExp. Returns `{ respondWith, callTool }`. |
| `.onMessage(p).respondWith(text, opts?)` | Respond with text content when pattern matches. Returns `MockLLM` for chaining. |
| `.onMessage(p).callTool(name, input?)` | Emit a tool call when pattern matches. Returns `MockLLM` for chaining. |
| `.onToolCall(toolName).returnResult(result)` | Configure the string result returned when a specific tool is called. Returns `MockLLM` for chaining. |
| `.setDefault(text, opts?)` | Set the fallback response for unmatched messages. Returns `MockLLM` for chaining. |
| `.getCalls()` | Returns `ReadonlyArray<{ messages, tools? }>` — all LLM calls made. |
| `.callCount` | Number of times the mock LLM was invoked. |
| `.reset()` | Clear the call log. |
| `.asGenerateWithTools()` | Returns a `generateWithTools` function for injection into `createAgentHandler`. |
| `.asStreamWithTools()` | Returns a `streamWithTools` async generator for injection. |
| `MockLLM.zeroCost()` | Static. Returns a cost calculator that always returns `{ costUSD: 0 }`. |

### createTestAgent(options)

Creates a test agent that runs the full agent loop with a mock LLM. Collects all events and returns structured results.

```typescript
import { createTestAgent, mockLLM, defineTool, textResult } from '@fabrk/framework'

const searchTool = defineTool({
  name: 'search',
  description: 'Search for information',
  schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  handler: async (input) => textResult(`Results for: ${input.query}`),
})

const mock = mockLLM()
  .onMessage('search').callTool('search', { query: 'cats' })
  .setDefault('Found cats!')

const agent = createTestAgent({ mock, tools: [searchTool], systemPrompt: 'You are helpful.' })
const result = await agent.send('search for cats')
```

`TestAgentOptions`:
- `mock` (required) — `MockLLM` instance
- `name` — agent name (default: `"test-agent"`)
- `systemPrompt` — injected as first system message
- `tools` — array of `ToolDefinition` instances
- `stream` — use streaming path (default: `false`)
- `maxIterations` — max tool-calling rounds (default: `10`)

`TestAgentResult`:
```typescript
interface TestAgentResult {
  content: string                                               // final text response
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>  // all tool calls made
  usage: { promptTokens: number; completionTokens: number; cost: number }
  events: AgentEvent[]                                         // raw event stream
}
```

### Assertion Helpers

All helpers return `boolean` and do not throw — use them with your test framework's `expect`.

```typescript
import {
  calledTool, calledToolWith, respondedWith,
  costUnder, iterationsUnder, getToolCalls,
} from '@fabrk/framework'

expect(calledTool(result, 'search')).toBe(true)
expect(calledToolWith(result, 'search', { query: 'cats' })).toBe(true)
expect(respondedWith(result, 'cats')).toBe(true)
expect(respondedWith(result, /\d+ cats/)).toBe(true)
expect(costUnder(result, 0.01)).toBe(true)
expect(iterationsUnder(result, 3)).toBe(true)

const calls = getToolCalls(result, 'search')
// calls: Array<{ name: string; input: Record<string, unknown> }>
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `calledTool` | `(result, toolName) => boolean` | True if agent called the named tool at least once. |
| `calledToolWith` | `(result, toolName, expectedInput) => boolean` | True if agent called the tool with input matching all keys in `expectedInput`. Partial match — extra keys on the actual input are ignored. |
| `respondedWith` | `(result, text | RegExp) => boolean` | True if `result.content` contains the string or matches the regex. |
| `costUnder` | `(result, maxCost) => boolean` | True if `result.usage.cost <= maxCost`. |
| `iterationsUnder` | `(result, maxIterations) => boolean` | True if the number of `tool-call` events is `<= maxIterations`. |
| `getToolCalls` | `(result, toolName) => Array<{ name, input }>` | Extract all tool calls for a specific tool name. |

## CLI Commands

| Command | What It Does |
|---------|-------------|
| `fabrk dev` | Vite dev server + MCP tools + agent scanning |
| `fabrk build` | Production build + AGENTS.md generation |
| `fabrk start` | Start production server |
| `fabrk info` | Show agents, tools, prompts |
| `fabrk agents` | List all discovered agents with model, tools, memory, auth details |
| `fabrk check` | Validate Node.js version, config, app directory, agents, tools, tsconfig |
| `fabrk test` | Run vitest with passthrough args |

### fabrk agents

Lists all agents discovered under `agents/` with their full configuration details: name, route pattern, file path, model, tools, memory enabled, auth setting.

```
fabrk agents

  Found 2 agent(s):

  chat
    Route:  /api/agents/chat
    File:   agents/chat.ts
    Model:  claude-sonnet-4-6
    Tools:  search-docs, sql_query
    Auth:   required

  analyst
    Route:  /api/agents/analyst
    File:   agents/analyst.ts
    Model:  gpt-4.1
```

### fabrk check

Runs health checks and reports `[OK]`, `[INFO]`, or `[WARN]` for each item:
- Node.js version (22+ required)
- `package.json` present
- `fabrk.config.ts` / `fabrk.config.js` (informational if missing)
- `app/` directory
- Vite config
- Agent definitions (validates `model` field)
- Tool count
- `tsconfig.json`

Exits non-zero if issues are found.

### fabrk test

Runs vitest via `execFileSync`. All extra args pass through to vitest:

```bash
fabrk test                    # run all tests
fabrk test --watch            # watch mode
fabrk test agents/chat.test.ts  # run specific file
```

## Dashboard

The `/__ai` dev dashboard is localhost-only. It shows real-time stats, cost trends, tool usage, and errors. Refreshes every 2 seconds.

### Dashboard API

| Endpoint | Response |
|----------|----------|
| `GET /__ai` | HTML dashboard |
| `GET /__ai/api` | JSON with agents, tools, costs, trends, tool stats, error stats |
| `GET /__ai/api/export` | JSON download (same data as `/__ai/api` with `exportedAt` timestamp) |

### recordError(record)

Record an error for dashboard tracking. Call this from agent error handlers or tool error paths.

```typescript
import { recordError } from '@fabrk/framework/fabrk'

recordError({
  timestamp: Date.now(),
  agent: 'chat',
  error: 'LLM request timed out',
})
```

`ErrorRecord` shape:
- `timestamp: number` — Unix milliseconds
- `agent: string` — agent name
- `error: string` — error message (safe — not leaked to clients)

Dashboard aggregates errors by agent (`errorStats.byAgent`) and surfaces the 20 most recent in reverse-chronological order (`errorStats.recent`).

### Dashboard Observability Functions (from `@fabrk/framework/fabrk`)

| Export | Signature | Description |
|--------|-----------|-------------|
| `recordError` | `(record: ErrorRecord) => void` | Record an error for the dashboard error table. Capped at 100 entries (ring buffer). |
| `recordCall` | `(record: CallRecord) => void` | Record an LLM call. Capped at 100. Non-finite cost values are ignored. |
| `recordToolCall` | `(record: ToolCallRecord) => void` | Record a tool call with duration. Capped at 200. |
| `setAgents` | `(count: number) => void` | Update agent count shown in dashboard. |
| `setTools` | `(count: number) => void` | Update tool count shown in dashboard. |
| `setSkills` | `(count: number) => void` | Update skill count shown in dashboard. |
| `setThreadCount` | `(count: number) => void` | Update thread count shown in dashboard. |
| `setMaxDelegationDepth` | `(depth: number) => void` | Update max delegation depth shown. |
| `setMCPExposed` | `(exposed: boolean) => void` | Toggle MCP indicator in dashboard. |

Cost trends are aggregated hourly with per-agent breakdown. Tool stats include call count, average duration in ms, and the list of agents that called each tool.

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
  ai: { defaultModel: 'claude-sonnet-4-6' },
  security: { csrf: true, csp: true },
})
```

## Runtime Exports

```typescript
import { scanRoutes, matchRoute, handleRequest } from '@fabrk/framework'
import { nodeToWebRequest, writeWebResponse } from '@fabrk/framework'
import { createFetchHandler } from '@fabrk/framework/worker'
```

## AI Model Pricing

The following models have pricing entries in `@fabrk/ai` (per 1K tokens, USD):

### Anthropic Claude

| Model | Input | Output |
|-------|-------|--------|
| `claude-haiku-4-5-20251001` | $0.0008 | $0.004 |
| `claude-sonnet-4-6` | $0.003 | $0.015 |
| `claude-opus-4-6` | $0.015 | $0.075 |
| `claude-3-5-sonnet-20241022` | $0.003 | $0.015 |
| `claude-3-5-haiku-20241022` | $0.0008 | $0.004 |

### OpenAI GPT-4.1 Series

| Model | Input | Output |
|-------|-------|--------|
| `gpt-4.1` | $0.002 | $0.008 |
| `gpt-4.1-mini` | $0.0004 | $0.0016 |
| `gpt-4.1-nano` | $0.0001 | $0.0004 |
| `gpt-4o` | $0.0025 | $0.01 |
| `gpt-4o-mini` | $0.00015 | $0.0006 |

### OpenAI Reasoning Models

| Model | Input | Output |
|-------|-------|--------|
| `o3` | $0.01 | $0.04 |
| `o3-mini` | $0.0011 | $0.0044 |
| `o4-mini` | $0.0011 | $0.0044 |
| `o1` | $0.015 | $0.06 |
| `o1-mini` | $0.003 | $0.012 |

### Embedding Models

| Model | Input |
|-------|-------|
| `text-embedding-3-small` | $0.00002 |
| `text-embedding-3-large` | $0.00013 |

## Security

- Path traversal protection on prompt loading
- Error internals never leaked to HTTP clients (all error paths return generic messages; details logged server-side)
- Request body size capped at 1 MB on MCP endpoint and agent routes
- Session cost map capped at 10,000 entries
- `/__ai` dashboard is localhost-only (checks `req.socket.remoteAddress` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) on all response paths including auth guard errors, SSE streams, dashboard, and agent route errors

## Bug Fixes (Phase 1)

These were corrected and are verified by tests:

- `SemanticMemoryStore.search()` returns full message content (was returning empty string)
- `llm-caller` passes full conversation history (multi-turn) to the LLM
- `route-handler` tracks `promptTokens` and `completionTokens` separately in response
- Streaming path persists memory (user + assistant messages saved after stream completes)
- Delegation depth correctly propagated via `X-Fabrk-Delegation-Depth` header; starts at 1, increments for each sub-delegation
- `defineSupervisor` enforces `maxDelegations` (default: 5, capped at 10)
- Tool executor uses `Object.hasOwn()` instead of `in` to prevent prototype pollution
- `useAgent` error handling sanitized (error internals not exposed to client)
- OpenAI streaming tool call fallback fixed
- Vite plugin correctly wires memory store
- Skills `applySkill` and `composeSkills` preserve tool definitions in `skillToolDefinitions`

## Performance

- `InMemoryMemoryStore` (and related stores) use O(1) ring buffer eviction for capped collections, replacing O(n) `Array.shift()` operations
