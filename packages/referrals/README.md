# @fabrk/referrals

Provider-agnostic referral and affiliate marketing toolkit with click tracking, commission calculation, payouts, and webhook delivery.

## Installation

```bash
npm install @fabrk/referrals
```

## Usage

```ts
import {
  InMemoryReferralStore,
  trackClick,
  trackConversion,
  createPayout,
  getAffiliateStats,
} from '@fabrk/referrals'

const store = new InMemoryReferralStore()

// Track a referral click
const result = await trackClick(store, { referralCode: 'ABC123' })

// Track a conversion and calculate commission
const { conversion, commission } = await trackConversion(store, {
  referralCode: 'ABC123',
  eventType: 'purchase',
  amountCents: 9900,
})

// Get affiliate analytics
const stats = await getAffiliateStats(store, affiliateId)
```

## Features

- **Click Tracking** - Record referral link clicks with cookie-based attribution keys
- **Conversion Tracking** - Track signups, purchases, trials, and leads tied to referral codes
- **Commission Engine** - Rule-based calculation supporting percentage and fixed rate types, with partner group overrides
- **Payout Management** - Aggregate approved commissions into payouts across bank transfer, PayPal, Stripe, or crypto
- **Affiliate Analytics** - Click counts, conversion rates, earnings breakdowns (total, pending, paid)
- **Webhook Delivery** - HMAC-SHA256 signed event dispatch for affiliate, referral, commission, and payout lifecycle events
- **Injectable Store** - `ReferralStore` interface for persistence; ships with `InMemoryReferralStore` for dev/testing
- **Web Crypto API** - Uses standard Web Crypto for attribution key generation and webhook signing (no Node.js crypto dependency)

## Store Interface

All functions accept a `ReferralStore` as the first argument. Implement the interface for your database, or use the built-in `InMemoryReferralStore`:

```ts
import type { ReferralStore } from '@fabrk/referrals'

class PrismaReferralStore implements ReferralStore {
  // implement affiliate, referral, click, conversion,
  // commission, partner group, and payout methods
}
```

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
