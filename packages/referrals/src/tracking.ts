/**
 * Referral click tracking and attribution
 *
 * Tracks clicks on referral links and manages cookie-based attribution.
 */

import type {
  ReferralClick,
  ReferralStore,
  TrackClickOptions,
  TrackConversionOptions,
  Conversion,
  Commission,
} from './types'
import { processConversion } from './commission'

/**
 * Generate a unique attribution key for tracking.
 */
export function generateAttributionKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Build the attribution cookie value.
 */
export function buildAttributionCookie(opts: {
  referralCode: string
  affiliateId: string
  attributionKey: string
}): string {
  return JSON.stringify({
    referral_code: opts.referralCode,
    attribution_key: opts.attributionKey,
    affiliate_id: opts.affiliateId,
    timestamp: Date.now(),
  })
}

/**
 * Track a referral click.
 *
 * @returns The click record and attribution key for cookie setting
 */
export async function trackClick(
  store: ReferralStore,
  options: TrackClickOptions
): Promise<{ click: ReferralClick; attributionKey: string } | null> {
  const affiliate = await store.getAffiliateByCode(options.referralCode)
  if (!affiliate) return null

  const attributionKey = generateAttributionKey()

  const click = await store.createClick({
    affiliateId: affiliate.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    referer: options.referer,
    attributionKey,
    metadata: options.metadata,
  })

  return { click, attributionKey }
}

/**
 * Track a conversion event.
 * Creates a conversion record and calculates commission.
 *
 * @returns The conversion and commission records, or null if affiliate not found
 */
export async function trackConversion(
  store: ReferralStore,
  options: TrackConversionOptions
): Promise<{ conversion: Conversion; commission: Commission } | null> {
  const affiliate = await store.getAffiliateByCode(options.referralCode)
  if (!affiliate) return null

  const conversion = await store.createConversion({
    affiliateId: affiliate.id,
    eventType: options.eventType,
    amountCents: options.amountCents,
    currency: options.currency || 'USD',
    status: 'pending',
    customerEmail: options.customerEmail,
    metadata: options.metadata,
  })

  const commission = await processConversion(store, conversion, affiliate)

  return { conversion, commission }
}
