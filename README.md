<p align="center">
  <strong>> FABRK</strong><br/>
  <em>The first UI framework designed for AI coding agents</em>
</p>

<p align="center">
  <a href="https://github.com/jpoindexter/fabrk-framework/actions/workflows/ci.yml"><img src="https://github.com/jpoindexter/fabrk-framework/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/jpoindexter/fabrk-framework/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jpoindexter/fabrk-framework" alt="License" /></a>
  <img src="https://img.shields.io/badge/packages-16-green" alt="Packages" />
  <img src="https://img.shields.io/badge/components-70%2B-green" alt="Components" />
  <img src="https://img.shields.io/badge/tests-292-green" alt="Tests" />
  <img src="https://img.shields.io/badge/node-%3E%3D22-blue" alt="Node" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
</p>

---

Stop generating 500 lines of custom components from scratch. Import pre-built, theme-aware components and tools. Ship full-stack apps in minutes, not hours.

```typescript
// When a user says: "Build me a dashboard"
// The AI generates this:
import { BarChart, KPICard, DataTable } from '@fabrk/components'
import { AICostTracker } from '@fabrk/ai'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

export default function Dashboard() {
  return (
    <div className="grid gap-4 p-6">
      <KPICard title="REVENUE" value="$12,340" trend={12.5} />
      <Card className={cn("border border-border p-4", mode.radius)}>
        <BarChart data={chartData} />
      </Card>
    </div>
  )
}
```

**Result:** 2 minutes. Consistent design. Built-in features. Happy user.

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
pnpm install
pnpm dev
```

Or add to an existing project:

```bash
pnpm add @fabrk/core @fabrk/components @fabrk/themes
```

## Packages

FABRK is a modular monorepo — install only what you need.

### Framework (core product)

| Package | Description |
|---------|-------------|
| [`@fabrk/core`](packages/core) | Runtime, plugins, middleware, hooks, teams, jobs, feature flags, auto-wiring |
| [`@fabrk/config`](packages/config) | Type-safe config builder with Zod validation (14 sections) |
| [`@fabrk/ai`](packages/ai) | LLM providers, cost tracking, embeddings, streaming, prompts, budget enforcement |
| [`@fabrk/auth`](packages/auth) | NextAuth adapter, API keys (SHA-256), MFA (TOTP + backup codes) |
| [`@fabrk/payments`](packages/payments) | Stripe, Polar, Lemon Squeezy adapters |
| [`@fabrk/email`](packages/email) | Resend adapter, console adapter, 4 templates |
| [`@fabrk/storage`](packages/storage) | S3, Cloudflare R2, local filesystem adapters |
| [`@fabrk/security`](packages/security) | CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS |
| [`@fabrk/mcp`](packages/mcp) | Model Context Protocol server toolkit |
| [`@fabrk/store-prisma`](packages/store-prisma) | Prisma store adapters for teams, API keys, audit, notifications, jobs, webhooks, feature flags |
| [`@fabrk/referrals`](packages/referrals) | Referral system |

### Design System (opt-in, shadcn-style)

| Package | Description |
|---------|-------------|
| [`@fabrk/themes`](packages/themes) | 18 themes, design tokens, `mode` object, runtime switching via CSS variables |
| [`@fabrk/components`](packages/components) | 70+ pre-built UI components, 8 chart types, AI chat, admin, security |
| [`@fabrk/ui`](packages/ui) | Component registry (shadcn-style copy-into-project) |

### CLI

| Package | Description |
|---------|-------------|
| [`create-fabrk-app`](packages/cli) | Project scaffolding + `fabrk` dev CLI |

## Configuration

One config file controls everything:

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'nextjs', typescript: true, srcDir: 'src' },
  theme: { system: 'terminal', colorScheme: 'green', radius: 'sharp' },
  ai: { costTracking: true, budget: { daily: 50 } },
  auth: { adapter: 'nextauth', mfa: { enabled: true }, apiKeys: { enabled: true } },
  payments: { adapter: 'stripe', mode: 'test' },
  email: { adapter: 'resend' },
  security: { csrf: { enabled: true }, rateLimit: { enabled: true }, csp: { enabled: true } },
  notifications: { enabled: true },
  teams: { enabled: true },
  featureFlags: { enabled: true },
})
```

## CLI Commands

```bash
# Scaffold
npx create-fabrk-app my-app --template ai-saas

# Development
fabrk dev                          # Dev server (generates .fabrk/ configs, wraps next dev)
fabrk build                        # Production build
fabrk lint                         # Design system compliance checks

# Code Generation
fabrk generate component MetricsCard   # React component with design tokens
fabrk generate page settings           # Next.js page
fabrk generate api webhooks            # Next.js API route
fabrk generate ai-rules                # CLAUDE.md / cursor rules from config

# Info
fabrk info                         # Project info + installed packages
```

## Templates

| Template | What you get |
|----------|-------------|
| **basic** | Clean starting point with `@fabrk/core` and `@fabrk/themes` |
| **ai-saas** | AI-powered SaaS with cost tracking, API keys, streaming |
| **dashboard** | Admin dashboard with teams, feature flags, webhooks, audit logging |

## Design System

Terminal-inspired aesthetic with runtime theme switching. 18 themes, design tokens, no hardcoded colors.

```tsx
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

// Full borders — always add mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Buttons — UPPERCASE with > prefix
<Button>> SUBMIT</Button>

// Labels — UPPERCASE in brackets
<Badge>[ACTIVE]</Badge>

// Design tokens — never hardcode colors
className="bg-primary text-primary-foreground"  // correct
className="bg-blue-500 text-white"              // wrong
```

## Built for AI Agents

FABRK is designed to be consumed by AI coding assistants. Every package includes:

- **`AGENTS.md`** — AI-readable docs with all components, props, and usage examples
- **`.fabrk/manifest.json`** — Auto-generated component/feature inventory for agent discovery
- **AI cost tracking** — Built-in `AICostTracker` with budget enforcement middleware
- **Provider fallback** — Automatic LLM failover across providers

Works with **Claude Code**, **Cursor**, **GitHub Copilot**, **v0.dev**, **Windsurf**, and **Cline**.

## Architecture

```
@fabrk/config (foundational — Zod schemas, zero deps)
@fabrk/themes (standalone — design tokens, CSS vars, no core dep)
    |
@fabrk/core (runtime — plugins, middleware, hooks)
    |
@fabrk/auth, payments, email, storage, security, ai, mcp
    |
@fabrk/components, @fabrk/ui (design system consumers)
    |
fabrk CLI (orchestrates everything)
```

**Key patterns:**
- **Adapter pattern** — All external services behind provider-agnostic interfaces
- **Store pattern** — Injectable stores with in-memory defaults for dev/testing
- **Web Crypto API** — Used throughout (no Node.js crypto dependency)
- **Config-driven** — `fabrk.config.ts` at project root, like `next.config.js`

## Development

```bash
# Prerequisites: Node.js 22+, pnpm 9+

pnpm install        # Install dependencies
pnpm build          # Build all 18 packages
pnpm test           # Run 292 tests
pnpm type-check     # TypeScript validation
pnpm dev            # Watch mode
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, workflow, and commit conventions.

## License

[MIT](LICENSE)
