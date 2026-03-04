# FABRK Framework Documentation

FABRK is a monorepo of packages that gives AI coding agents working implementations to import instead of generating everything from scratch. Auth, payments, dashboard UI — you import them. You don't write them.

The framework has two distinct layers:

- **Application packages** — standalone libraries you add to any React/Next.js app (`@fabrk/auth`, `@fabrk/payments`, `@fabrk/components`, etc.)
- **Runtime** — the `fabrk` package, which is a full Vite 7 server runtime with file-system routing, SSR, AI agent infrastructure, and MCP support

You do not need the runtime to use the application packages.

---

## Contents

| Doc | What it covers |
|-----|----------------|
| [framework.md](./framework.md) | The `fabrk` package: Vite plugin, routing, SSR, agents, tools, MCP, workflows, evals |
| [ai.md](./ai.md) | The `@fabrk/ai` package: LLM providers, embeddings, RAG, cost tracking, streaming |
| [components.md](./components.md) | The `@fabrk/components` package: UI library, charts, AI chat, hooks |
| [packages.md](./packages.md) | All other packages: config, design-system, core, auth, payments, email, storage, security, store-prisma |

---

## Package map

```
@fabrk/config          — Zod schemas for validated app configuration
@fabrk/design-system   — 18 themes, design tokens, the `mode` object
@fabrk/core            — Plugins, middleware, teams, jobs, feature flags, webhooks
    ↓
@fabrk/payments        — Stripe, Polar, Lemon Squeezy
@fabrk/auth            — NextAuth, API keys, TOTP MFA
@fabrk/email           — Resend adapter + 4 email templates
@fabrk/storage         — S3, R2, local filesystem
@fabrk/security        — CSRF, CSP, rate limiting, audit logging, GDPR, CORS
@fabrk/store-prisma    — Prisma implementations of core store interfaces
    ↓
@fabrk/ai              — LLM providers, embeddings, RAG, cost tracking
@fabrk/components      — 109+ UI components, 10 chart types, AI chat, 15 hooks
    ↓
fabrk                  — Vite runtime + file-system routing + SSR + agents + MCP + CLI
create-fabrk-app       — CLI scaffolding
```

---

## Setup

```bash
# New project
pnpm create fabrk-app my-app

# Existing Vite project
pnpm add fabrk
pnpm add -D @vitejs/plugin-react
```

The packages that ship React components (`@fabrk/components`, `@fabrk/design-system`) are framework-agnostic — they work in Next.js, Vite, Remix, or anything that can import React components.

---

## Conventions that appear everywhere

**Design tokens, not colors.** Every component uses semantic CSS variables (`bg-primary`, `text-foreground`, `border-border`). Hardcoded Tailwind colors like `bg-blue-500` break the theme system.

**`mode` for Tailwind classes.** The `mode` object from `@fabrk/design-system` maps token names to Tailwind strings. Components use it so the theme can change at runtime via CSS variables without a rebuild.

**Adapter pattern.** Every external service — payments, email, storage — sits behind a simple interface. You swap the real service for a fake one in tests without changing your app code. In-memory defaults are provided for local development.

**Web Crypto API throughout.** No `node:crypto` — everything runs on edge runtimes and browser workers. Use `bytesToHex` and `generateRandomHex` from `@fabrk/core` rather than inlining hex conversion.
