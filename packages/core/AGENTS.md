# @fabrk/core — AGENTS.md

> Framework runtime, plugin system, and core utilities for FABRK

## Overview

| | |
|---|---|
| **Package** | `@fabrk/core` |
| **Language** | TypeScript |
| **Modules** | Framework, Plugins, Middleware, Notifications, Teams, Feature Flags, Webhooks, Jobs |
| **Tests** | 55+ tests across 6 test files |

## Quick Start

```ts
import { createFabrk, PluginRegistry, createMiddleware } from '@fabrk/core'

// Initialize framework
const fabrk = createFabrk({ theme: 'terminal' })

// Plugin registry
const registry = new PluginRegistry()
registry.register('payment', stripeAdapter)
registry.register('auth', nextAuthAdapter)

// Middleware chain
const chain = createMiddleware()
  .use(authMiddleware)
  .use(rateLimitMiddleware)
await chain.run(context)
```

## Exports

### Framework
| Export | Type | Description |
|--------|------|-------------|
| `createFabrk` | Function | Initialize the framework |
| `FabrkProvider` | Component | React context provider |
| `useFabrk` | Hook | Access framework context |
| `useDesignSystem` | Hook | Access design system |
| `cn` | Function | Class name utility (clsx + tailwind-merge) |

### Plugin System
| Export | Type | Description |
|--------|------|-------------|
| `PluginRegistry` | Class | Register and retrieve typed adapters |
| `FabrkPlugin` | Interface | Base plugin interface |
| `PaymentAdapter` | Interface | Payment provider contract |
| `AuthAdapter` | Interface | Auth provider contract |
| `EmailAdapter` | Interface | Email provider contract |
| `StorageAdapter` | Interface | Storage provider contract |
| `RateLimitAdapter` | Interface | Rate limiter contract |

### Middleware
| Export | Type | Description |
|--------|------|-------------|
| `createMiddleware` | Function | Create composable middleware chain |
| `compose` | Function | Compose multiple middleware into one |
| `authMiddleware` | Preset | Session/API key verification |
| `rateLimitMiddleware` | Preset | Rate limiting |
| `corsMiddleware` | Preset | CORS headers |
| `securityHeadersMiddleware` | Preset | Security headers |

### Feature Modules
| Export | Type | Description |
|--------|------|-------------|
| `createNotificationManager` | Function | Toast + persistent notification system |
| `createTeamManager` | Function | Organization/member/invite management |
| `createFeatureFlagManager` | Function | Feature flags with rollout % and targeting |
| `createWebhookManager` | Function | Webhook dispatch with retry and HMAC signing |
| `createJobQueue` | Function | Background job queue with priorities and retries |
| `InMemoryTeamStore` | Class | In-memory team store for dev |

### Store Interfaces
All feature modules accept store interfaces for persistence:
- `NotificationStore`, `TeamStore`, `FeatureFlagStore`
- `JobStore`, `WebhookStore`, `AuditStore`
- `PaymentStore`, `AuthStore`, `ApiKeyStore`

## Key Design Decisions

- **Adapter pattern**: All external services abstracted behind interfaces
- **Store pattern**: Database access via injectable store interfaces (like `CostStore` in AI)
- **In-memory defaults**: Every store has an in-memory implementation for dev/testing
- **Web Crypto API**: Used for tokens, hashing (no Node.js crypto dependency)

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
pnpm test         # Run tests (plugins, middleware, notifications, teams, flags, jobs)
```
