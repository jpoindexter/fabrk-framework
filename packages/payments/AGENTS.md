# @fabrk/payments — AGENTS.md

> Payment adapters for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/payments` |
| **Language** | TypeScript |
| **Adapters** | Stripe, Polar, Lemon Squeezy |
| **Pattern** | Provider-agnostic adapter (implements `PaymentAdapter` from `@fabrk/core`) |

## Quick Start

```ts
import { createStripeAdapter } from '@fabrk/payments'

const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})

// Create checkout session
const { url } = await payments.createCheckout({
  priceId: 'price_xxx',
  successUrl: '/success',
  cancelUrl: '/cancel',
})
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createStripeAdapter` | Function | Creates a Stripe payment adapter |
| `createPolarAdapter` | Function | Creates a Polar payment adapter |
| `createLemonSqueezyAdapter` | Function | Creates a Lemon Squeezy payment adapter |
| `InMemoryPaymentStore` | Class | In-memory store for dev/testing |
| `StripeAdapterConfig` | Type | Stripe config options |
| `PolarAdapterConfig` | Type | Polar config options |
| `LemonSqueezyAdapterConfig` | Type | Lemon Squeezy config options |

## Adapter Methods

All adapters implement `PaymentAdapter`:

- `isConfigured()` — Check if keys are set
- `createCheckout(options)` — Create a checkout session
- `handleWebhook(payload, signature)` — Verify and parse webhook events
- `getCustomer(id)` — Get customer info
- `getSubscription(id)` — Get subscription info
- `cancelSubscription(id, options?)` — Cancel a subscription
- `createPortalSession?(customerId, returnUrl)` — Stripe billing portal

## Peer Dependencies

- `stripe` — Required for Stripe adapter
- `@polar-sh/sdk` — Required for Polar adapter
- `@lemonsqueezy/lemonsqueezy.js` — Required for Lemon Squeezy adapter

All are optional; only install what you use.

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
```
