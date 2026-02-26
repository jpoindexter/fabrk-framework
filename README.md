<p align="center">
  <strong>> FABRK</strong><br/>
  <em>The first UI framework designed for AI coding agents</em>
</p>

<p align="center">
  <a href="https://github.com/jpoindexter/fabrk-framework/actions/workflows/ci.yml"><img src="https://github.com/jpoindexter/fabrk-framework/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/jpoindexter/fabrk-framework/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jpoindexter/fabrk-framework" alt="License" /></a>
  <img src="https://img.shields.io/badge/packages-13-green" alt="Packages" />
  <img src="https://img.shields.io/badge/components-109%2B-green" alt="Components" />
  <img src="https://img.shields.io/badge/tests-858-green" alt="Tests" />
  <img src="https://img.shields.io/badge/themes-18-green" alt="Themes" />
  <img src="https://img.shields.io/badge/node-%3E%3D22-blue" alt="Node" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
</p>

<p align="center">
  <a href="https://framework.fabrk.dev">Docs</a> &middot;
  <a href="https://framework.fabrk.dev/demo">Live Demo</a> &middot;
  <a href="https://framework.fabrk.dev/components">Components</a> &middot;
  <a href="https://framework.fabrk.dev/about">About</a>
</p>

---

## The Story

FABRK started as a production boilerplate called [fabrk.dev](https://fabrk.dev) — a Next.js starter built and refined over years of shipping real SaaS products. Every new project pulled in the same patterns: auth flows, payment integrations, dashboard shells, data tables, theme systems, AI tooling. The boilerplate grew into something genuinely useful — 109+ components, 18 themes, auth with MFA, three payment providers, AI cost tracking, security hardening — all battle-tested in production.

Copying a boilerplate works until it doesn't. Bug fixes in one project didn't propagate to others. So the extraction began: components became `@fabrk/components`, auth became `@fabrk/auth`, payments, email, storage, security — each concern got its own package. The monorepo took shape: 13 packages, each with a focused responsibility.

The framework layer — routing, SSR, Cloudflare Workers deployment — was being built from scratch when Cloudflare released [**vinext**](https://github.com/cloudflare/vinext). Vinext did almost exactly what FABRK was building for the runtime and server layer: Vite-based SSR on Workers, Next.js API shims, MIT licensed.

Rather than compete with Cloudflare on runtime infrastructure, FABRK pivoted to where the unique value lived — everything else. The [`fabrk`](packages/framework) meta-package now depends on vinext for the runtime and layers on AI agents, tools, MCP, 109+ components, auth, payments, and the design system on top.

**`fabrk = vinext (runtime) + batteries (everything else)`**

---

## What It Does

Stop generating 500 lines of custom components from scratch. Import pre-built, theme-aware components and tools. Ship full-stack apps in minutes, not hours.

```typescript
import { DashboardShell, KpiCard, BarChart, DataTable, Badge } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <DashboardShell sidebarItems={items} user={user} onSignOut={signOut}>
      <div className="grid grid-cols-4 gap-3 p-4">
        <KpiCard title="REVENUE" value="$12,340" change={12.5} trend="up" />
        <KpiCard title="USERS" value="1,572" change={8.3} trend="up" />
      </div>
      <BarChart data={chartData} xAxisKey="month" series={[{ dataKey: 'revenue', name: 'Revenue' }]} />
      <DataTable columns={columns} data={users} searchKey="name" />
    </DashboardShell>
  )
}
```

**Result:** Full dashboard with sidebar, KPIs, charts, and data table. 2 minutes. Consistent design across 18 themes.

See the [live demo](https://framework.fabrk.dev/demo) — a complete CodeScan dashboard built entirely with FABRK components.

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
pnpm install
pnpm dev
```

Or add to an existing project:

```bash
pnpm add @fabrk/core @fabrk/components @fabrk/design-system
```

## Packages

FABRK is a modular monorepo — install only what you need.

### Core

| Package | Description |
|---------|-------------|
| [`@fabrk/core`](packages/core) | Runtime, plugins, middleware, teams, jobs, feature flags, auto-wiring |
| [`@fabrk/config`](packages/config) | Type-safe config builder with Zod validation (13 sections) |
| [`@fabrk/design-system`](packages/design-system) | 18 themes, design tokens, `mode` object, runtime switching via CSS variables |
| [`@fabrk/components`](packages/components) | 109+ UI components, 15 hooks, 11 chart types, AI chat, admin, security |

### Adapters & Services

| Package | Description |
|---------|-------------|
| [`@fabrk/ai`](packages/ai) | LLM providers, cost tracking, embeddings, streaming, prompts, budget enforcement |
| [`@fabrk/auth`](packages/auth) | NextAuth adapter, API keys (SHA-256), MFA (TOTP + backup codes) |
| [`@fabrk/payments`](packages/payments) | Stripe, Polar, Lemon Squeezy adapters |
| [`@fabrk/email`](packages/email) | Resend adapter, console adapter, 4 templates |
| [`@fabrk/storage`](packages/storage) | S3, Cloudflare R2, local filesystem adapters |
| [`@fabrk/security`](packages/security) | CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS |
| [`@fabrk/store-prisma`](packages/store-prisma) | Prisma store adapters for teams, API keys, audit, notifications, jobs, webhooks, feature flags |

### Framework

| Package | Description |
|---------|-------------|
| [`fabrk`](packages/framework) | Full-stack framework built on [vinext](https://github.com/cloudflare/vinext) — AI agents, tools, MCP, dashboard, CLI |

### CLI

| Package | Description |
|---------|-------------|
| [`create-fabrk-app`](packages/cli) | Project scaffolding CLI with 3 starter templates |

## Built for AI Agents

FABRK is designed to be consumed by AI coding assistants. Every package includes:

- **`AGENTS.md`** — AI-readable docs with all components, props, and usage examples
- **AI cost tracking** — Built-in `AICostTracker` with budget enforcement middleware
- **Provider fallback** — Automatic LLM failover across providers
- **Type-safe interfaces** — Discoverable by LLMs reading type signatures

Works with **Claude Code**, **Cursor**, **GitHub Copilot**, **v0.dev**, **Windsurf**, and **Cline**.

## Design System

Terminal-inspired aesthetic with runtime theme switching. 18 themes, design tokens, no hardcoded colors.

```tsx
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

// Full borders — always add mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Buttons — UPPERCASE with > prefix
<Button>> SUBMIT</Button>

// Design tokens — never hardcode colors
className="bg-primary text-primary-foreground"  // correct
className="bg-blue-500 text-white"              // wrong
```

## Architecture

```
@fabrk/config (foundational — Zod schemas, zero deps)
@fabrk/design-system (foundational — 18 themes, design tokens, CSS vars)
    |
@fabrk/core (runtime — plugins, middleware, hooks)
    |
@fabrk/auth, payments, email, storage, security, ai
    |
@fabrk/components (109+ UI components, charts, dashboard)
@fabrk/store-prisma (Prisma database adapters)
    |
fabrk (vinext runtime + AI agents + tools + MCP)
create-fabrk-app CLI (scaffolding)
```

**Key patterns:**
- **Adapter pattern** — All external services behind provider-agnostic interfaces
- **Store pattern** — Injectable stores with in-memory defaults for dev/testing
- **Web Crypto API** — Used throughout (no Node.js crypto — runs on edge runtimes)
- **Config-driven** — `fabrk.config.ts` at project root, validated by Zod

## Development

```bash
# Prerequisites: Node.js 22+, pnpm 9+

pnpm install        # Install dependencies
pnpm build          # Build all 19 packages (13 libs + 6 examples)
pnpm test           # Run 858 tests
pnpm type-check     # TypeScript validation across 22 packages
pnpm dev            # Watch mode
```

## Documentation

The docs site lives at [framework.fabrk.dev](https://framework.fabrk.dev) and dogfoods FABRK packages. It includes:

- 40+ documentation pages with Cmd+K search
- 30 component doc pages with live previews
- Interactive 18-theme switcher
- Tutorials for dashboards, auth, and payments
- [Live demo dashboard](https://framework.fabrk.dev/demo)

```bash
cd examples/docs
pnpm dev    # localhost:3001
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, workflow, and commit conventions.

## Who Built This

Built by [Jason Poindexter](https://github.com/jpoindexter). FABRK is the distillation of years of shipping SaaS products — every pattern that worked, extracted and packaged so the next project starts further ahead.

## License

[MIT](LICENSE)
