# @fabrk/config — AGENTS.md

> Type-safe configuration builder for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/config` |
| **Language** | TypeScript |
| **Validation** | Zod schemas |
| **Sections** | 12 configuration areas |
| **Tests** | 12 tests |

## Quick Start

```ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  ai: { costTracking: true, providers: ['claude', 'openai'] },
  design: { theme: 'terminal', radius: 'sharp' },
  payments: { adapter: 'stripe', mode: 'test' },
  auth: { adapter: 'nextauth', apiKeys: { enabled: true }, mfa: { enabled: true } },
  security: { csrf: { enabled: true }, rateLimit: { enabled: true } },
})
```

## Configuration Sections

All sections are optional. Only configure what you use.

| Section | Key Options |
|---------|-------------|
| `ai` | `costTracking`, `validation` (strict/loose/off), `providers`, `budget` |
| `design` | `theme`, `radius` (sharp/rounded/pill) |
| `payments` | `adapter` (stripe/polar/lemonsqueezy), `mode` (test/live), `config` |
| `auth` | `adapter` (nextauth/custom), `apiKeys`, `mfa`, `config` |
| `email` | `adapter` (resend/console/custom), `from`, `replyTo` |
| `storage` | `adapter` (s3/r2/local), `maxFileSize`, `allowedTypes`, `config` |
| `security` | `csrf`, `csp`, `rateLimit`, `auditLog`, `headers`, `cors` |
| `notifications` | `enabled`, `persistToDb`, `maxPerUser` |
| `teams` | `enabled`, `maxMembers`, `maxOrgsPerUser`, `roles` |
| `featureFlags` | `enabled`, `adapter` (memory/custom) |
| `webhooks` | `enabled`, `signingSecret`, `retryAttempts`, `retryDelayMs` |
| `jobs` | `enabled`, `adapter` (memory/custom), `concurrency`, `retryAttempts` |

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `defineFabrkConfig` | Function | Validate and return typed config |
| `fabrkConfigSchema` | Zod Schema | Full config schema (for custom validation) |
| `aiConfigSchema` | Zod Schema | AI section schema |
| `paymentsConfigSchema` | Zod Schema | Payments section schema |
| `authConfigSchema` | Zod Schema | Auth section schema |
| `emailConfigSchema` | Zod Schema | Email section schema |
| `storageConfigSchema` | Zod Schema | Storage section schema |
| `securityConfigSchema` | Zod Schema | Security section schema |
| `notificationsConfigSchema` | Zod Schema | Notifications section schema |
| `teamsConfigSchema` | Zod Schema | Teams section schema |
| `featureFlagsConfigSchema` | Zod Schema | Feature flags section schema |
| `webhooksConfigSchema` | Zod Schema | Webhooks section schema |
| `jobsConfigSchema` | Zod Schema | Jobs section schema |
| `FabrkConfig` | Type | Inferred full config type |
| + 12 section types | Type | Individual section types (e.g., `AIConfig`, `PaymentsConfig`) |

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
pnpm test         # Run tests (schema validation)
```
