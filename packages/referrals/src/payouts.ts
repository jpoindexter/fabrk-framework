/**
 * Payout management
 *
 * Aggregates commissions into payouts and manages the payout lifecycle.
 */

import type {
  Payout,
  ReferralStore,
  CreatePayoutOptions,
} from './types'

/**
 * Create a payout from approved commissions.
 * Marks included commissions as paid and creates the payout record.
 */
export async function createPayout(
  store: ReferralStore,
  options: CreatePayoutOptions
): Promise<Payout> {
  // Get all commissions to include
  const allCommissions = await store.getCommissionsByAffiliate(options.affiliateId)
  const selectedCommissions = allCommissions.filter(
    (c) => options.commissionIds.includes(c.id) && c.status === 'approved'
  )

  if (selectedCommissions.length === 0) {
    throw new Error('No approved commissions found for the given IDs')
  }

  // Sum up commission amounts
  const totalCents = selectedCommissions.reduce((sum, c) => sum + c.amountCents, 0)

  // Create payout
  const payout = await store.createPayout({
    affiliateId: options.affiliateId,
    amountCents: totalCents,
    commissionCount: selectedCommissions.length,
    method: options.method,
    status: 'pending',
    notes: options.notes,
  })

  // Mark commissions as paid
  const now = new Date()
  for (const commission of selectedCommissions) {
    await store.updateCommission(commission.id, {
      status: 'paid',
      paidAt: now,
    })
  }

  return payout
}

/**
 * Update payout status. Sets processedAt when completed.
 */
export async function updatePayoutStatus(
  store: ReferralStore,
  payoutId: string,
  status: 'processing' | 'completed' | 'failed',
  notes?: string
): Promise<Payout> {
  const updates: Record<string, unknown> = { status }

  if (status === 'completed') {
    updates.processedAt = new Date()
  }
  if (notes) {
    updates.notes = notes
  }

  return store.updatePayout(payoutId, updates as any)
}
