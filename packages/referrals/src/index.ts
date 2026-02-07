/**
 * @fabrk/referrals
 *
 * Provider-agnostic referral and affiliate marketing toolkit.
 *
 * @example
 * ```ts
 * import {
 *   InMemoryReferralStore,
 *   trackClick,
 *   trackConversion,
 *   createPayout,
 *   getAffiliateStats,
 * } from '@fabrk/referrals'
 *
 * const store = new InMemoryReferralStore()
 *
 * // Track a click
 * const result = await trackClick(store, { referralCode: 'ABC123' })
 *
 * // Track a conversion
 * const { conversion, commission } = await trackConversion(store, {
 *   referralCode: 'ABC123',
 *   eventType: 'purchase',
 *   amountCents: 9900,
 * })
 * ```
 */

// Commission engine
export { calculateCommission, processConversion } from './commission'

// Tracking
export {
  generateAttributionKey,
  buildAttributionCookie,
  trackClick,
  trackConversion,
} from './tracking'

// Payouts
export { createPayout, updatePayoutStatus } from './payouts'

// Analytics
export { getAffiliateStats } from './analytics'

// Webhooks
export {
  signWebhookPayload,
  deliverWebhook,
  dispatchWebhook,
} from './webhooks'

// In-memory store
export { InMemoryReferralStore } from './memory-store'

// Types
export type {
  // Enums
  ReferralStatus,
  ConversionType,
  ConversionStatus,
  CommissionStatus,
  CommissionRuleType,
  PayoutStatus,
  PayoutMethod,
  // Entities
  Affiliate,
  Referral,
  ReferralClick,
  Conversion,
  Commission,
  CommissionRule,
  PartnerGroup,
  Payout,
  // Stores
  ReferralStore,
  // Options
  TrackClickOptions,
  TrackConversionOptions,
  CreatePayoutOptions,
  AffiliateStats,
} from './types'

export type {
  ReferralWebhookEvent,
  WebhookConfig,
  WebhookDeliveryResult,
} from './webhooks'
