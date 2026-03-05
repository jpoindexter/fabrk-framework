# @fabrk/payments — Agent Reference

Payment adapters for Stripe, Polar, and Lemon Squeezy. All three implement the
`PaymentAdapter` interface from `@fabrk/core` so you can swap providers without
changing application code.

## Install

```bash
pnpm add @fabrk/payments
# Peer dep for Stripe only:
pnpm add stripe
```

---

## Adapters

### Stripe

```ts
import { createStripeAdapter } from '@fabrk/payments'

const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  // apiVersion?: '2024-12-18.acacia'  // optional override
})
```

**Methods available:**
- `payments.createCheckout(options)` — creates a Checkout Session, returns `{ id, url, raw }`
- `payments.handleWebhook(payload, signature)` — verifies + deduplicates, returns `WebhookResult`
- `payments.getCustomer(customerId)` — returns `CustomerInfo | null`
- `payments.getSubscription(subscriptionId)` — returns `SubscriptionInfo | null`
- `payments.cancelSubscription(id, { atPeriodEnd? })` — cancels immediately or at period end
- `payments.createPortalSession(customerId, returnUrl)` — returns Stripe billing portal URL

### Polar

```ts
import { createPolarAdapter } from '@fabrk/payments'

const payments = createPolarAdapter({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!, // required for webhook verification
  // organizationId?: string
})
```

Polar uses svix webhook signatures. Pass svix headers as the `headers` argument:

```ts
const result = await payments.handleWebhook(rawBody, signature, {
  'webhook-id': req.headers['webhook-id'],
  'webhook-timestamp': req.headers['webhook-timestamp'],
  'webhook-signature': req.headers['webhook-signature'],
})
```

### Lemon Squeezy

```ts
import { createLemonSqueezyAdapter } from '@fabrk/payments'

const payments = createLemonSqueezyAdapter({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  storeId: process.env.LEMONSQUEEZY_STORE_ID!,
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
})
```

Signature is HMAC-SHA256 hex. Pass the `X-Signature` header value as `signature`.

---

## Common Interface (`PaymentAdapter` from `@fabrk/core`)

```ts
interface PaymentAdapter {
  name: string                    // 'stripe' | 'polar' | 'lemonsqueezy'
  isConfigured(): boolean
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>
  handleWebhook(payload, signature, headers?): Promise<WebhookResult>
  getCustomer(id: string): Promise<CustomerInfo | null>
  getSubscription(id: string): Promise<SubscriptionInfo | null>
  cancelSubscription(id: string, opts?): Promise<void>
}
```

`CheckoutOptions` fields: `priceId`, `successUrl`, `cancelUrl`, `customerEmail?`,
`customerId?`, `subscription?`, `trialDays?`, `metadata?`

---

## Idempotency Internals

All three adapters share the following exports from `packages/payments/src/idempotency.ts`:

**`DEFAULT_CACHE_SIZE`** — `10_000`. Maximum number of processed event IDs held in the in-process idempotency cache before LRU eviction. All three adapters use this value — do not hardcode it.

**`decodePayload(payload)`** — normalizes `string | ArrayBuffer` to `string`. All adapters call this instead of inlining `new TextDecoder().decode(payload)`.

```ts
// internal use only — consumed by adapters, not typically called directly
import { DEFAULT_CACHE_SIZE, decodePayload } from '@fabrk/payments/idempotency'
```

---

## Polar `isConfigured()` — Security Note

`isConfigured()` checks **both** `accessToken` AND `webhookSecret`. An adapter configured without a `webhookSecret` returns `false` from `isConfigured()` and `handleWebhook()` returns `{ verified: false, error: '...' }` for every call. Previously only `accessToken` was checked, which silently allowed an unconfigured webhook secret to pass the readiness check.

```ts
// Both are required — missing either means isConfigured() === false
const payments = createPolarAdapter({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!, // required
})
```

---

## Webhook Handling Pattern

All adapters include replay protection (5-minute timestamp window) and in-process
idempotency deduplication.

```ts
// app/api/webhooks/stripe/route.ts
import { createStripeAdapter } from '@fabrk/payments'

const payments = createStripeAdapter({ ... })

export async function POST(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  const result = await payments.handleWebhook(body, sig)

  if (!result.verified) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  if (result.duplicate) {
    return Response.json({ ok: true }) // already processed
  }

  switch (result.event?.type) {
    case 'checkout.session.completed':
      // provision access
      break
    case 'customer.subscription.deleted':
      // revoke access
      break
  }

  return Response.json({ ok: true })
}
```

> **Serverless note:** The built-in idempotency cache is process-scoped and does not
> survive cold starts. For production serverless (Vercel, Lambda), use Redis or a
> database store to deduplicate across function instances.

---

## Testing — InMemoryPaymentStore

```ts
import { InMemoryPaymentStore } from '@fabrk/payments'

const store = new InMemoryPaymentStore()
// store.saveCustomer(customer)
// store.getCustomer(userId)
// store.saveSubscription(subscription)
// store.getSubscription(subscriptionId)
```

Use this in tests and local dev in place of a real database-backed `PaymentStore`.

---

## Key Types (all re-exported from `@fabrk/core`)

| Type | Key Fields |
|------|-----------|
| `CheckoutResult` | `id`, `url`, `raw` |
| `WebhookResult` | `verified`, `duplicate?`, `event?`, `error?` |
| `CustomerInfo` | `id`, `email`, `name?`, `subscriptions[]`, `metadata` |
| `SubscriptionInfo` | `id`, `status`, `priceId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd` |
| `PaymentStore` | `getCustomer`, `saveCustomer`, `getSubscription`, `saveSubscription` |

`SubscriptionInfo.status` values: `active` | `trialing` | `past_due` | `canceled` | `unpaid` | `paused`
