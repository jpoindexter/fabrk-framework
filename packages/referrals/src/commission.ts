/**
 * Commission calculation engine
 *
 * Rule-based commission calculation supporting percentage and fixed rate types.
 * Partner group rates override default rules when available.
 */

import type {
  Commission,
  CommissionRule,
  Conversion,
  Affiliate,
  PartnerGroup,
  ReferralStore,
} from './types'

/**
 * Calculate commission amount for a conversion.
 *
 * Priority:
 * 1. Partner group rate (if affiliate belongs to a group)
 * 2. Matching commission rule
 * 3. Default commission rule
 *
 * @returns Commission amount in cents, or 0 if no rule applies
 */
export function calculateCommission(
  amountCents: number,
  rule: CommissionRule | null,
  partnerGroup: PartnerGroup | null
): { amountCents: number; rate: number } {
  // Partner group rate takes priority
  if (partnerGroup) {
    const rate = partnerGroup.commissionRate
    return {
      amountCents: Math.floor(amountCents * rate),
      rate,
    }
  }

  if (!rule) {
    return { amountCents: 0, rate: 0 }
  }

  if (rule.type === 'percentage') {
    const rate = rule.value / 100
    return {
      amountCents: Math.floor((amountCents * rule.value) / 100),
      rate,
    }
  }

  // Fixed amount
  return {
    amountCents: Math.floor(rule.value),
    rate: amountCents > 0 ? rule.value / amountCents : 0,
  }
}

/**
 * Process a conversion: calculate and create a commission record.
 */
export async function processConversion(
  store: ReferralStore,
  conversion: Conversion,
  affiliate: Affiliate
): Promise<Commission> {
  // Get partner group if affiliate belongs to one
  let partnerGroup: PartnerGroup | null = null
  if (affiliate.partnerGroupId) {
    partnerGroup = await store.getPartnerGroup(affiliate.partnerGroupId)
  }

  // Get default commission rule
  const defaultRule = await store.getDefaultRule()

  // Calculate commission
  const { amountCents, rate } = calculateCommission(
    conversion.amountCents,
    defaultRule,
    partnerGroup
  )

  // Create commission record
  const commission = await store.createCommission({
    affiliateId: affiliate.id,
    conversionId: conversion.id,
    amountCents,
    rate,
    status: 'pending',
    ruleId: defaultRule?.id,
  })

  // Update affiliate balance
  await store.updateAffiliate(affiliate.id, {
    balanceCents: affiliate.balanceCents + amountCents,
  })

  return commission
}
