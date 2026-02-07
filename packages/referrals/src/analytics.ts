/**
 * Referral analytics and statistics
 */

import type { ReferralStore, AffiliateStats } from './types'

/**
 * Get stats for a single affiliate.
 */
export async function getAffiliateStats(
  store: ReferralStore,
  affiliateId: string
): Promise<AffiliateStats> {
  const [clicks, conversions, commissions] = await Promise.all([
    store.getClicksByAffiliate(affiliateId),
    store.getConversionsByAffiliate(affiliateId),
    store.getCommissionsByAffiliate(affiliateId),
  ])

  const totalClicks = clicks.length
  const totalConversions = conversions.length
  const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0

  const totalEarningsCents = commissions.reduce((sum, c) => sum + c.amountCents, 0)
  const pendingCommissionsCents = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + c.amountCents, 0)
  const paidCommissionsCents = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amountCents, 0)

  return {
    totalClicks,
    totalConversions,
    conversionRate,
    totalEarningsCents,
    pendingCommissionsCents,
    paidCommissionsCents,
  }
}
