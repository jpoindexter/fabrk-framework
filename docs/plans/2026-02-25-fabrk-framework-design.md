# FABRK Framework Design Document

**Date:** 2026-02-25
**Status:** Draft
**Author:** Jason Poindexter + Claude

## Vision

An AI-first React framework built on Vite. Fork vinext (Cloudflare's Next.js reimplementation on Vite), add AI-native conventions for agents, tools, prompts, and cost tracking. Existing `@fabrk/*` packages become the framework's built-in runtime.

**One-liner:** "The React framework where AI agents are as native as pages and API routes."

## Decisions

- **Name:** fabrk
- **Target users:** Both human developers building AI apps AND AI coding agents generating apps
- **Compatibility:** Next.js conventions for pages/routing + new AI-native conventions on top
- **Deployment:** Multi-target from day one (Cloudflare Workers, Node.js, Vercel)
- **Foundation:** Fork `cloudflare/vinext` (MIT license, Vite plugin, 94% Next.js API coverage)
- **Timeline:** 1 week to MVP (vinext took 1 week from scratch; we're extending, not rebuilding)

## Architecture

### What vinext provides (inherited)

- Vite plugin implementing Next.js API surface
- App Router + Pages Router
- React Server Components via `@vitejs/plugin-rsc`
- SSR streaming + client hydration
- File-system routing (`app/`, `pages/`)
- Server Actions + Metadata API
- Middleware system
- Pluggable cache layer (ISR support)
- Cloudflare Workers deployment
- 1,700+ Vitest tests, 380+ Playwright E2E tests

### What fabrk adds (the AI layer)

- `agents/` directory convention + `defineAgent()` runtime
- `tools/` directory convention + auto-registration + MCP server
- `prompts/` directory convention + hot-reload in dev
- Built-in AI runtime (`@fabrk/ai` — LLM providers, streaming, cost tracking, budgets)
- Built-in MCP server (`@fabrk/mcp` — tools, resources, stdio transport)
- Built-in auth (`@fabrk/auth` — API keys, MFA, middleware guards)
- Built-in security (`@fabrk/security` — CSRF, CSP, rate limiting, audit)
- Cost tracking dashboard at `/__ai` in dev mode
- AGENTS.md auto-generation on build
- `fabrk` CLI (`fabrk dev`, `fabrk build`, `fabrk deploy`)
- Node.js + Vercel deployment targets (in addition to Workers)

---

## Section 1: Project Structure

```
my-app/
├── fabrk.config.ts           # unified config (Zod-validated, 12+ sections)
├── app/                       # standard Next.js App Router (inherited from vinext)
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       └── route.ts
├── agents/                    # AI agent definitions (file-system convention)
│   ├── chat/
│   │   └── agent.ts          # defineAgent({ model, tools, budget })
│   └── summarize/
│       └── agent.ts
├── tools/                     # MCP tools, auto-registered
│   ├── search-docs.ts        # defineTool({ name, schema, handler })
│   └── create-ticket.ts
├── prompts/                   # file-system prompt templates (hot-reload in dev)
│   ├── system.md
│   └── extract-data.md
└── public/
```

**Key decisions:**
- `app/` works exactly like Next.js / vinext — zero learning curve
- `agents/`, `tools/`, `prompts/` are new AI-native directories
- Each uses file-system conventions like `app/` does for routes
- `fabrk.config.ts` replaces `next.config.js` (can read both for migration)

---

## Section 2: Agent System

### defineAgent()

Each file in `agents/` exports a default agent definition:

```typescript
// agents/chat/agent.ts
import { defineAgent } from 'fabrk'

export default defineAgent({
  // Model configuration
  model: 'claude-sonnet-4-5-20250514',
  fallback: ['gpt-4o', 'ollama:llama3'],    // automatic failover

  // Prompt (file reference = hot-reloads in dev)
  systemPrompt: './prompts/system.md',

  // Tools (auto-discovered from tools/ directory)
  tools: ['search-docs', 'create-ticket'],

  // Budget enforcement (built into framework, not bolted on)
  budget: {
    daily: 10.00,           // USD per day
    perSession: 0.50,       // USD per conversation
    alertThreshold: 0.8,    // warn at 80%
  },

  // Streaming (default: true)
  stream: true,

  // Auth requirement
  auth: 'required',          // 'required' | 'optional' | 'none'
})
```

### What the framework does with this

1. **Auto-generates an API route** at `/api/agents/chat` (POST)
   - Accepts `{ messages: [...] }` body
   - Returns streaming SSE response
   - Applies budget enforcement middleware automatically
   - Applies auth middleware if `auth: 'required'`
   - Tracks cost per call via `AICostTracker`

2. **Auto-generates a React hook** `useAgent('chat')`
   ```tsx
   const { send, messages, isStreaming, cost } = useAgent('chat')
   ```

3. **Registers tools** from the `tools` array — resolved from `tools/` directory

4. **Provider fallback** — tries models in order, falls back automatically

5. **Dev mode** — shows live token usage, cost, and latency in `/__ai` dashboard

### Agent route behavior

```
POST /api/agents/chat
Headers: Authorization: Bearer <token>  (if auth: 'required')
Body: { "messages": [{ "role": "user", "content": "Hello" }] }
Response: text/event-stream (SSE)

data: {"type":"text","content":"Hi"}
data: {"type":"text","content":" there!"}
data: {"type":"usage","promptTokens":12,"completionTokens":8,"cost":0.0003}
data: {"type":"done"}
```

---

## Section 3: Tool System

### defineTool()

Each file in `tools/` exports a tool definition:

```typescript
// tools/search-docs.ts
import { defineTool, textResult } from 'fabrk'

export default defineTool({
  name: 'search-docs',
  description: 'Search the documentation for relevant content',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results', default: 5 },
    },
    required: ['query'],
  },

  async handler({ query, limit }) {
    const results = await searchIndex(query, limit)
    return textResult(results.map(r => `${r.title}: ${r.snippet}`).join('\n'))
  },
})
```

### What the framework does with this

1. **Makes tools available to agents** — agents reference tools by name
2. **Auto-starts MCP server** in dev — `fabrk dev` runs an MCP server on stdio
   - Claude Code, Cursor, etc. can connect and use your tools directly
3. **Generates tool documentation** — tools are included in AGENTS.md
4. **Type-safe** — input schema is validated at runtime via Zod conversion

### MCP server in dev

When you run `fabrk dev`, the framework:
- Starts the Vite dev server (pages, HMR)
- Starts an MCP server exposing all `tools/` as MCP tools
- Watches `tools/` for changes and hot-reloads

This means Claude Code can use your app's tools while you develop.

---

## Section 4: Prompt System

### File-system prompts

```
prompts/
├── system.md              # referenced as './prompts/system.md' in agents
├── extract-data.md
└── partials/
    ├── tone.md            # composable partials
    └── constraints.md
```

### Template syntax

```markdown
<!-- prompts/system.md -->
You are a {{role}} assistant for {{appName}}.

{{> partials/tone.md}}

## Constraints
{{> partials/constraints.md}}

## Context
The user's current page is: {{currentPage}}
```

- `{{variable}}` — interpolated at runtime from agent context
- `{{> path}}` — include partial (resolved relative to prompts/)
- Files are watched in dev — change a prompt, agent uses new version immediately
- No build step — prompts are read at request time in dev, bundled in production

---

## Section 5: Built-in Runtime (existing @fabrk/* packages)

The existing packages become framework internals:

| Package | Framework Role | How It's Exposed |
|---------|---------------|-----------------|
| `@fabrk/ai` | AI runtime | `defineAgent()`, `useAgent()`, cost tracking, streaming |
| `@fabrk/mcp` | MCP server | `defineTool()`, auto-started in `fabrk dev` |
| `@fabrk/config` | Config system | `fabrk.config.ts` with `defineFabrkConfig()` |
| `@fabrk/auth` | Auth middleware | `auth: 'required'` in agents, `withAuth()` in routes |
| `@fabrk/security` | Security middleware | CSRF, CSP, rate limiting auto-applied from config |
| `@fabrk/components` | UI library | `import { ChatInput } from 'fabrk/components'` |
| `@fabrk/design-system` | Themes | `import { mode } from 'fabrk/themes'` |

Users don't install these separately — they come with `fabrk`.

```bash
npm install fabrk    # gets everything
```

Individual packages remain available for advanced use:
```bash
npm install @fabrk/ai    # just the AI runtime, no framework
```

---

## Section 6: CLI

```bash
# Create new project
npx create-fabrk-app my-app

# Development (Vite dev server + MCP server + AI dashboard)
fabrk dev                     # localhost:3000 + /__ai dashboard

# Build
fabrk build                   # production build + AGENTS.md generation

# Deploy
fabrk deploy                  # auto-detect target, or:
fabrk deploy --target workers # Cloudflare Workers
fabrk deploy --target node    # Node.js standalone
fabrk deploy --target vercel  # Vercel

# Migrate from Next.js
fabrk init                    # converts next.config.js -> fabrk.config.ts

# Info
fabrk info                    # project info, agent count, tool count, budget status
```

---

## Section 7: Dev Dashboard (/__ai)

In dev mode, `fabrk dev` serves a dashboard at `http://localhost:3000/__ai`:

```
┌─────────────────────────────────────────────────┐
│ [FABRK] AI DASHBOARD                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ AGENTS              TOOLS            BUDGET     │
│ ├─ chat (active)    ├─ search-docs   $2.40/$10  │
│ └─ summarize        └─ create-ticket [24%]      │
│                                                 │
│ RECENT CALLS                                    │
│ ┌──────────────────────────────────────────────┐│
│ │ 14:32:01 chat    claude-sonnet  0.003s $0.02 ││
│ │ 14:31:58 chat    claude-sonnet  1.2s   $0.04 ││
│ │ 14:31:45 summary gpt-4o         0.8s   $0.01 ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ TODAY: 47 calls | $2.40 spent | avg 0.9s        │
└─────────────────────────────────────────────────┘
```

Shows: registered agents, available tools, budget usage, call history with model/latency/cost, errors.

Built using `@fabrk/components` (DashboardShell, KPICard, DataTable) — dogfooding the framework.

---

## Section 8: Deployment Targets

### Cloudflare Workers (inherited from vinext)
- `fabrk deploy --target workers`
- KV for ISR cache, Durable Objects for agent sessions
- AI bindings for Cloudflare AI models
- Zero config — inherited from vinext

### Node.js (new)
- `fabrk deploy --target node`
- Outputs a standalone Node.js server (like `next start --standalone`)
- Uses Vite's Environment API for Node.js target
- File-system cache for ISR
- Deploy to Railway, Render, AWS, any VPS

### Vercel (new)
- `fabrk deploy --target vercel`
- Outputs Vercel serverless functions
- Edge runtime for middleware
- vinext blog mentioned "proof-of-concept working on Vercel in less than 30 minutes"

---

## Section 9: Migration Path

### From Next.js

```bash
cd my-nextjs-app
npx fabrk init
```

This:
1. Replaces `next` with `fabrk` in package.json
2. Converts `next.config.js` to `fabrk.config.ts`
3. Everything else stays the same — `app/`, `pages/`, imports all work
4. AI features are opt-in — add `agents/`, `tools/`, `prompts/` when ready

### From vinext

Even simpler — replace `vinext` with `fabrk`. The Next.js compatibility layer is identical.

### From FABRK component library (current repo)

The current `@fabrk/*` packages become the framework internals. Existing users:
```diff
- import { KPICard } from '@fabrk/components'
+ import { KPICard } from 'fabrk/components'
```

Both import paths work during transition.

---

## Section 10: Implementation Plan (1 Week)

### Day 1: Fork + Rename
- Fork `cloudflare/vinext` into new repo
- Rename CLI from `vinext` to `fabrk`
- Replace branding, update package.json
- Verify `fabrk dev` and `fabrk build` work with existing vinext tests
- Wire in `fabrk.config.ts` support (read both `next.config.js` and `fabrk.config.ts`)

### Day 2: Agent System
- Implement `agents/` directory scanning (Vite plugin hook)
- Implement `defineAgent()` runtime
- Auto-generate `/api/agents/[name]` routes from agent definitions
- Wire in `@fabrk/ai` for LLM calls (providers, streaming, fallback)
- Wire in budget enforcement middleware from `@fabrk/ai`
- Write tests for agent routing and streaming responses

### Day 3: Tool + Prompt System
- Implement `tools/` directory scanning
- Implement `defineTool()` with schema validation
- Wire in `@fabrk/mcp` — auto-start MCP server in `fabrk dev`
- Implement `prompts/` directory with `{{variable}}` interpolation and `{{> partial}}` includes
- Hot-reload for tools and prompts in dev mode
- Write tests

### Day 4: Built-in Runtime Integration
- Wire `@fabrk/auth` — `auth: 'required'` in agents triggers `withAuth` middleware
- Wire `@fabrk/security` — auto-apply CSRF, rate limiting, CSP from config
- Implement `useAgent()` React hook
- Implement cost tracking per-agent (automatic, no user code needed)
- Bundle `@fabrk/components` as `fabrk/components` export

### Day 5: Dev Dashboard + AGENTS.md
- Build `/__ai` dashboard page (SSR'd, uses @fabrk/components)
- Show: agents, tools, budget, call history, errors
- Implement AGENTS.md auto-generation on `fabrk build`
- Documents all agents, tools, prompts, API routes for AI consumption

### Day 6: Multi-target Deploy
- Node.js standalone output (Vite Environment API)
- Vercel adapter (serverless functions output)
- Keep Workers target from vinext
- `fabrk deploy --target <workers|node|vercel>`
- Write deployment tests

### Day 7: Polish + Tests
- Port relevant vinext tests, add AI-specific tests
- E2E test: create app → define agent → call agent → verify streaming response
- E2E test: define tool → verify MCP registration → verify agent can use tool
- Update CLI (`create-fabrk-app`) with new templates
- Write README, update existing docs

---

## What This Is NOT

- Not a wrapper around Next.js output (that's OpenNext's approach)
- Not a component library (that's what @fabrk/* currently is)
- Not just an API route convention (agents are first-class, not afterthoughts)
- Not Cloudflare-specific (multi-target from day one)

## What Makes This Different from "Next.js + AI libraries"

| Feature | Next.js + libraries | fabrk |
|---------|--------------------|----|
| LLM calls | Wire up SDK in API route | `defineAgent()` — 5 lines |
| Cost tracking | Install library, add middleware | Automatic on every agent call |
| Streaming | Write ReadableStream pipes | Built into agent response |
| Prompts | Hardcoded strings in code | File-system templates, hot-reload |
| Tools/MCP | Separate MCP server project | `tools/` directory, auto-registered |
| Budget limits | DIY middleware | Framework-level, per-agent |
| Observability | Add logging libraries | `/__ai` dashboard, zero config |
| Dev experience | No AI awareness | Dev server shows live token/cost |
| AI documentation | Write AGENTS.md manually | Auto-generated on build |
| Provider fallback | Try/catch chains | `fallback: ['claude', 'gpt-4o', 'ollama']` |

---

## Open Questions

1. **Repo structure:** New repo or new directory in fabrk-framework monorepo?
2. **Package name on npm:** `fabrk` (taken?) or scoped `@fabrk/framework`?
3. **vinext upstream tracking:** Hard fork (diverge) or soft fork (merge upstream changes)?
