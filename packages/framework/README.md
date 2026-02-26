# fabrk

**The full-stack framework for AI-powered apps, built on [vinext](https://github.com/cloudflare/vinext).**

[![Built on vinext](https://img.shields.io/badge/built%20on-vinext-orange)](https://github.com/cloudflare/vinext)
[![npm](https://img.shields.io/npm/v/fabrk)](https://www.npmjs.com/package/fabrk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

fabrk composes [vinext](https://github.com/cloudflare/vinext) (Vite 7 + Next.js API + Cloudflare Workers) with AI agents, tools, 105+ components, auth, payments, and 18 themes.

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
npm install
npx fabrk dev
```

## What You Get

| From vinext | From fabrk |
|-------------|------------|
| Vite 7 plugin | AI agents (`defineAgent()`) |
| SSR / RSC | Tools (`defineTool()`) + MCP |
| Next.js API shims | 105+ UI components |
| Cloudflare Workers deploy | 18 themes + design system |
| CLI (dev/build/deploy) | Auth (NextAuth, MFA, API keys) |
| | Payments (Stripe, Polar, Lemon) |
| | Security (CSRF, CSP, rate limiting) |
| | Email, storage, cost tracking |

## Usage

### Vite Plugin

```typescript
// vite.config.ts
import fabrk from 'fabrk'

export default {
  plugins: [fabrk()]
}
```

This gives you everything vinext provides plus AI agent scanning and the dev dashboard.

### AI Agents

```typescript
// agents/chat/agent.ts
import { defineAgent } from 'fabrk/agents'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  tools: ['search-docs'],
  systemPrompt: 'You are a helpful assistant.',
})
```

### Tools

```typescript
// tools/search-docs.ts
import { defineTool, textResult } from 'fabrk/tools'

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
fabrk dev        # vinext dev + AI agents + MCP server
fabrk build      # vinext build + AGENTS.md generation
fabrk deploy     # Cloudflare Workers deploy
fabrk info       # Show agents, tools, prompts
```

## Architecture

```
vinext (Cloudflare)          @fabrk/* packages
  Vite plugin                  @fabrk/components (105+ UI)
  SSR / RSC                    @fabrk/ai (LLM, cost tracking)
  Routing                      @fabrk/auth (NextAuth, MFA)
  Next.js shims                @fabrk/payments (Stripe, Polar)
  Cloudflare deploy            @fabrk/design-system (18 themes)
         |                     ... 6 more packages
         v
    +---------+
    |  fabrk  |  <-- composes both
    +---------+
```

## Packages

fabrk depends on the `@fabrk/*` ecosystem:

- **@fabrk/components** — 105+ UI components, 8 chart types, dashboard shell
- **@fabrk/ai** — LLM providers, cost tracking, embeddings, streaming
- **@fabrk/auth** — NextAuth, API keys, MFA (TOTP + backup codes)
- **@fabrk/payments** — Stripe, Polar, Lemon Squeezy adapters
- **@fabrk/security** — CSRF, CSP, rate limiting, audit, GDPR
- **@fabrk/design-system** — 18 themes, design tokens
- **@fabrk/core** — Framework runtime, plugins, middleware
- **@fabrk/config** — Type-safe config (Zod schemas)

## License

MIT
