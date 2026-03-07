# Launch Posts

## Twitter

open sourced the ui framework i've been building for ai coding agents

109+ components, 18 themes, own vite 7 runtime, auth, payments, storage, ai cost tracking — all the stuff i kept rebuilding across projects, now in 13 npm packages

3,221 tests. MIT licensed.

https://github.com/jpoindexter/fabrk-framework
https://www.npmjs.com/org/fabrk

---

## Reddit r/reactjs

**Title:** I open sourced a UI framework designed for AI coding agents — 109+ components, own Vite 7 runtime

**Body:**

i've been shipping saas products off the same nextjs boilerplate for years. every new project started with copying the repo, ripping out old business logic, keeping the infra. auth, payments, dashboards, charts, themes. it grew to 109+ components, 18 themes, mfa, three payment providers, ai cost tracking, rate limiting, audit logging.

bug fixes didn't propagate across copies so i started extracting everything into packages. 13 packages in a pnpm monorepo. then the framework layer needed its own runtime — file-system routing, SSR streaming, middleware — so i built one on vite 7 that deploys to node, cloudflare workers, deno, bun.

the key idea: ai coding agents (claude code, cursor, copilot) shouldn't generate 500 lines of custom components from scratch. they should import pre-built, theme-aware components and focus on business logic.

```typescript
import { DashboardShell, KpiCard, DataTable } from '@fabrk/components'
```

every package includes AGENTS.md files so ai assistants can discover components, props, and usage patterns.

**what's in it:**
- `@fabrk/components` — 109+ ui components, 11 chart types, dashboard shells
- `@fabrk/design-system` — 18 themes, design tokens, runtime css switching
- `@fabrk/auth` — nextauth adapter, api keys, mfa
- `@fabrk/payments` — stripe, polar, lemon squeezy
- `@fabrk/ai` — llm providers, cost tracking, streaming, budget enforcement
- `@fabrk/security` — csrf, csp, rate limiting, audit logging
- `@fabrk/framework` — own vite 7 runtime with file-system routing + ssr + ai agents + mcp

3,221 tests, 12 rounds of security audits, MIT licensed.

github: https://github.com/jpoindexter/fabrk-framework
npm: https://www.npmjs.com/org/fabrk
docs: https://framework.fabrk.dev
demo: https://framework.fabrk.dev/demo

extracted from fabrk.dev — a production boilerplate i've been refining for years.

happy to answer questions.

---

## Hacker News

**Title:** FABRK – UI framework designed for AI coding agents (109+ components, own Vite 7 runtime)

**Body:**

FABRK is a modular TypeScript framework extracted from years of shipping SaaS products. The core idea: AI coding agents shouldn't generate hundreds of lines of custom components. They should import pre-built, theme-aware components and tools.

13 packages covering components (109+), design system (18 themes), auth (MFA, API keys), payments (Stripe/Polar/Lemon Squeezy), AI (cost tracking, streaming, budget enforcement), security (CSRF, CSP, rate limiting), and a full-stack runtime built on Vite 7 with file-system routing and SSR streaming.

Each package includes AGENTS.md files for AI assistant discovery. Works with Claude Code, Cursor, Copilot, v0.dev.

3,221 tests, 12 security audit rounds, MIT licensed. Deploys to Node, Cloudflare Workers, Deno, Bun.

https://github.com/jpoindexter/fabrk-framework
