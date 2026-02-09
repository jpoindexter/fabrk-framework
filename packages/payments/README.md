# @fabrk/payments

Payment adapters for the FABRK framework, supporting Stripe, Polar, and Lemon Squeezy.

## Installation

```bash
npm install @fabrk/payments
```

Then install the provider SDK you need:

```bash
# For Stripe
npm install stripe

# Polar and Lemon Squeezy use the built-in fetch API (no extra deps)
```

## Usage

```tsx
import { createStripeAdapter } from '@fabrk/payments'

const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})

// Create a checkout session
const checkout = await payments.createCheckout({
  priceId: 'price_xxx',
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
  customerEmail: 'user@example.com',
  subscription: true,
  trialDays: 14,
})

// Handle webhooks
const result = await payments.handleWebhook(body, signature)
if (result.verified) {
  console.log(result.event.type) // e.g. 'checkout.session.completed'
}
```

### Polar

```tsx
import { createPolarAdapter } from '@fabrk/payments'

const payments = createPolarAdapter({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
})
```

### Lemon Squeezy

```tsx
import { createLemonSqueezyAdapter } from '@fabrk/payments'

const payments = createLemonSqueezyAdapter({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  storeId: process.env.LEMONSQUEEZY_STORE_ID!,
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
})
```

## Features

- **Stripe adapter** - Full Stripe integration with checkout sessions, subscriptions, customer portal, and webhook verification via the Stripe SDK
- **Polar adapter** - Open-source friendly payments via the Polar REST API with checkout and subscription management
- **Lemon Squeezy adapter** - Merchant of record payments with HMAC-SHA256 webhook verification via Web Crypto API
- **Unified interface** - All adapters implement the same `PaymentAdapter` interface from `@fabrk/core` (createCheckout, handleWebhook, getCustomer, getSubscription, cancelSubscription)
- **In-memory store** - `InMemoryPaymentStore` for development and testing without a database
- **Lazy loading** - Provider SDKs are loaded on first use, so unused adapters add zero overhead

## API

| Export | Description |
|--------|-------------|
| `createStripeAdapter(config)` | Create a Stripe payment adapter |
| `createPolarAdapter(config)` | Create a Polar payment adapter |
| `createLemonSqueezyAdapter(config)` | Create a Lemon Squeezy payment adapter |
| `InMemoryPaymentStore` | In-memory store for dev/testing |
| `PaymentStore` | Store interface type (from `@fabrk/core`) |
| `StripeAdapterConfig` | Stripe configuration type |
| `PolarAdapterConfig` | Polar configuration type |
| `LemonSqueezyAdapterConfig` | Lemon Squeezy configuration type |

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
