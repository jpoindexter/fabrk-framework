import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  InMemoryReferralStore,
  calculateCommission,
  processConversion,
  trackClick,
  trackConversion,
  generateAttributionKey,
  buildAttributionCookie,
  createPayout,
  updatePayoutStatus,
  getAffiliateStats,
  signWebhookPayload,
  deliverWebhook,
  dispatchWebhook,
} from '../index'
import type {
  Affiliate,
  Conversion,
  CommissionRule,
  PartnerGroup,
  ReferralStore,
  WebhookConfig,
} from '../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedAffiliate(
  store: InMemoryReferralStore,
  overrides: Partial<Omit<Affiliate, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Promise<Affiliate> {
  return store.createAffiliate({
    userId: 'user-1',
    referralCode: 'ABC123',
    balanceCents: 0,
    ...overrides,
  })
}

async function seedRule(
  store: InMemoryReferralStore,
  overrides: Partial<Omit<CommissionRule, 'id' | 'createdAt'>> = {}
): Promise<CommissionRule> {
  return store.createCommissionRule({
    name: 'Default 10%',
    type: 'percentage',
    value: 10,
    isDefault: true,
    isActive: true,
    ...overrides,
  })
}

// ============================================================================
// InMemoryReferralStore
// ============================================================================

describe('InMemoryReferralStore', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  // ---------- Affiliates ----------

  describe('affiliates', () => {
    it('should create and retrieve an affiliate by id', async () => {
      const affiliate = await seedAffiliate(store)

      const found = await store.getAffiliate(affiliate.id)
      expect(found).not.toBeNull()
      expect(found!.referralCode).toBe('ABC123')
      expect(found!.createdAt).toBeInstanceOf(Date)
    })

    it('should retrieve affiliate by referral code', async () => {
      await seedAffiliate(store)
      const found = await store.getAffiliateByCode('ABC123')
      expect(found).not.toBeNull()
      expect(found!.userId).toBe('user-1')
    })

    it('should retrieve affiliate by userId', async () => {
      await seedAffiliate(store)
      const found = await store.getAffiliateByUserId('user-1')
      expect(found).not.toBeNull()
      expect(found!.referralCode).toBe('ABC123')
    })

    it('should return null for nonexistent affiliate', async () => {
      expect(await store.getAffiliate('nope')).toBeNull()
      expect(await store.getAffiliateByCode('nope')).toBeNull()
      expect(await store.getAffiliateByUserId('nope')).toBeNull()
    })

    it('should update an affiliate', async () => {
      const affiliate = await seedAffiliate(store)
      const updated = await store.updateAffiliate(affiliate.id, { balanceCents: 5000 })
      expect(updated.balanceCents).toBe(5000)
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(affiliate.updatedAt.getTime())
    })

    it('should throw when updating nonexistent affiliate', async () => {
      await expect(store.updateAffiliate('nope', { balanceCents: 0 })).rejects.toThrow(
        'Affiliate nope not found'
      )
    })

    it('should list all affiliates', async () => {
      await seedAffiliate(store, { referralCode: 'A', userId: 'u1' })
      await seedAffiliate(store, { referralCode: 'B', userId: 'u2' })
      const all = await store.listAffiliates()
      expect(all).toHaveLength(2)
    })
  })

  // ---------- Referrals ----------

  describe('referrals', () => {
    it('should create and retrieve a referral', async () => {
      const affiliate = await seedAffiliate(store)
      const referral = await store.createReferral({
        affiliateId: affiliate.id,
        status: 'pending',
        leadEmail: 'lead@test.com',
      })

      const found = await store.getReferral(referral.id)
      expect(found).not.toBeNull()
      expect(found!.leadEmail).toBe('lead@test.com')
    })

    it('should return null for nonexistent referral', async () => {
      expect(await store.getReferral('nope')).toBeNull()
    })

    it('should update a referral', async () => {
      const affiliate = await seedAffiliate(store)
      const referral = await store.createReferral({
        affiliateId: affiliate.id,
        status: 'pending',
      })
      const updated = await store.updateReferral(referral.id, { status: 'approved' })
      expect(updated.status).toBe('approved')
    })

    it('should throw when updating nonexistent referral', async () => {
      await expect(store.updateReferral('nope', { status: 'approved' })).rejects.toThrow(
        'Referral nope not found'
      )
    })

    it('should list referrals by affiliate', async () => {
      const a1 = await seedAffiliate(store, { referralCode: 'A', userId: 'u1' })
      const a2 = await seedAffiliate(store, { referralCode: 'B', userId: 'u2' })
      await store.createReferral({ affiliateId: a1.id, status: 'pending' })
      await store.createReferral({ affiliateId: a1.id, status: 'pending' })
      await store.createReferral({ affiliateId: a2.id, status: 'pending' })

      const a1Referrals = await store.listReferralsByAffiliate(a1.id)
      expect(a1Referrals).toHaveLength(2)
    })
  })

  // ---------- Clicks ----------

  describe('clicks', () => {
    it('should create a click and list by affiliate', async () => {
      const affiliate = await seedAffiliate(store)
      const click = await store.createClick({
        affiliateId: affiliate.id,
        ipAddress: '1.2.3.4',
        attributionKey: 'abc',
      })
      expect(click.id).toBeDefined()
      expect(click.createdAt).toBeInstanceOf(Date)

      const clicks = await store.getClicksByAffiliate(affiliate.id)
      expect(clicks).toHaveLength(1)
      expect(clicks[0].ipAddress).toBe('1.2.3.4')
    })
  })

  // ---------- Conversions ----------

  describe('conversions', () => {
    it('should create a conversion and list by affiliate', async () => {
      const affiliate = await seedAffiliate(store)
      const conversion = await store.createConversion({
        affiliateId: affiliate.id,
        eventType: 'purchase',
        amountCents: 9900,
        currency: 'USD',
        status: 'pending',
      })
      expect(conversion.id).toBeDefined()

      const list = await store.getConversionsByAffiliate(affiliate.id)
      expect(list).toHaveLength(1)
      expect(list[0].amountCents).toBe(9900)
    })
  })

  // ---------- Commissions ----------

  describe('commissions', () => {
    it('should create and update a commission', async () => {
      const affiliate = await seedAffiliate(store)
      const commission = await store.createCommission({
        affiliateId: affiliate.id,
        amountCents: 990,
        rate: 0.1,
        status: 'pending',
      })
      expect(commission.id).toBeDefined()

      const updated = await store.updateCommission(commission.id, { status: 'approved' })
      expect(updated.status).toBe('approved')
    })

    it('should throw when updating nonexistent commission', async () => {
      await expect(store.updateCommission('nope', { status: 'approved' })).rejects.toThrow(
        'Commission nope not found'
      )
    })

    it('should list commissions by affiliate', async () => {
      const affiliate = await seedAffiliate(store)
      await store.createCommission({
        affiliateId: affiliate.id,
        amountCents: 100,
        rate: 0.1,
        status: 'pending',
      })
      await store.createCommission({
        affiliateId: affiliate.id,
        amountCents: 200,
        rate: 0.1,
        status: 'approved',
      })

      const list = await store.getCommissionsByAffiliate(affiliate.id)
      expect(list).toHaveLength(2)
    })

    it('should get pending commissions only', async () => {
      const affiliate = await seedAffiliate(store)
      await store.createCommission({
        affiliateId: affiliate.id,
        amountCents: 100,
        rate: 0.1,
        status: 'pending',
      })
      await store.createCommission({
        affiliateId: affiliate.id,
        amountCents: 200,
        rate: 0.1,
        status: 'approved',
      })

      const pending = await store.getPendingCommissions()
      expect(pending).toHaveLength(1)
      expect(pending[0].amountCents).toBe(100)
    })
  })

  // ---------- Commission Rules ----------

  describe('commission rules', () => {
    it('should create a rule and retrieve active rules', async () => {
      await seedRule(store)
      await store.createCommissionRule({
        name: 'Inactive',
        type: 'fixed',
        value: 500,
        isDefault: false,
        isActive: false,
      })

      const active = await store.getCommissionRules()
      expect(active).toHaveLength(1)
      expect(active[0].name).toBe('Default 10%')
    })

    it('should get the default rule', async () => {
      await seedRule(store)
      await store.createCommissionRule({
        name: 'Non-default',
        type: 'fixed',
        value: 500,
        isDefault: false,
        isActive: true,
      })

      const defaultRule = await store.getDefaultRule()
      expect(defaultRule).not.toBeNull()
      expect(defaultRule!.isDefault).toBe(true)
    })

    it('should return null when no default rule exists', async () => {
      const defaultRule = await store.getDefaultRule()
      expect(defaultRule).toBeNull()
    })
  })

  // ---------- Partner Groups ----------

  describe('partner groups', () => {
    it('should get partner group by id (via internal seeding)', async () => {
      // InMemoryReferralStore does not expose a createPartnerGroup method,
      // so we test getPartnerGroup returns null for unknown ids
      const group = await store.getPartnerGroup('unknown')
      expect(group).toBeNull()
    })

    it('should list partner groups (empty by default)', async () => {
      const groups = await store.listPartnerGroups()
      expect(groups).toHaveLength(0)
    })
  })

  // ---------- Payouts ----------

  describe('payouts', () => {
    it('should create and update a payout', async () => {
      const affiliate = await seedAffiliate(store)
      const payout = await store.createPayout({
        affiliateId: affiliate.id,
        amountCents: 5000,
        commissionCount: 3,
        method: 'bank_transfer',
        status: 'pending',
      })
      expect(payout.id).toBeDefined()

      const updated = await store.updatePayout(payout.id, { status: 'completed' })
      expect(updated.status).toBe('completed')
    })

    it('should throw when updating nonexistent payout', async () => {
      await expect(store.updatePayout('nope', { status: 'completed' })).rejects.toThrow(
        'Payout nope not found'
      )
    })

    it('should list payouts by affiliate', async () => {
      const affiliate = await seedAffiliate(store)
      await store.createPayout({
        affiliateId: affiliate.id,
        amountCents: 1000,
        commissionCount: 1,
        method: 'paypal',
        status: 'pending',
      })

      const list = await store.getPayoutsByAffiliate(affiliate.id)
      expect(list).toHaveLength(1)
    })
  })
})

// ============================================================================
// calculateCommission (pure function)
// ============================================================================

describe('calculateCommission', () => {
  it('should calculate percentage commission from a rule', () => {
    const rule: CommissionRule = {
      id: 'r1',
      name: '10%',
      type: 'percentage',
      value: 10,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    }
    const result = calculateCommission(10000, rule, null)
    expect(result.amountCents).toBe(1000) // 10% of 10000
    expect(result.rate).toBe(0.1)
  })

  it('should calculate fixed commission from a rule', () => {
    const rule: CommissionRule = {
      id: 'r2',
      name: 'Fixed $5',
      type: 'fixed',
      value: 500,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    }
    const result = calculateCommission(10000, rule, null)
    expect(result.amountCents).toBe(500)
    expect(result.rate).toBe(500 / 10000)
  })

  it('should use partner group rate when present (overrides rule)', () => {
    const rule: CommissionRule = {
      id: 'r1',
      name: '10%',
      type: 'percentage',
      value: 10,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    }
    const group: PartnerGroup = {
      id: 'g1',
      name: 'Premium',
      commissionRate: 0.2,
      isDefault: false,
      createdAt: new Date(),
    }
    const result = calculateCommission(10000, rule, group)
    expect(result.amountCents).toBe(2000) // 20% from partner group
    expect(result.rate).toBe(0.2)
  })

  it('should return 0 when no rule and no partner group', () => {
    const result = calculateCommission(10000, null, null)
    expect(result.amountCents).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('should floor fractional cent amounts for percentage', () => {
    const rule: CommissionRule = {
      id: 'r1',
      name: '15%',
      type: 'percentage',
      value: 15,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    }
    // 15% of 999 = 149.85 -> floors to 149
    const result = calculateCommission(999, rule, null)
    expect(result.amountCents).toBe(149)
  })

  it('should floor fractional cent amounts for partner group', () => {
    const group: PartnerGroup = {
      id: 'g1',
      name: 'Bronze',
      commissionRate: 0.07,
      isDefault: false,
      createdAt: new Date(),
    }
    // 7% of 999 = 69.93 -> floors to 69
    const result = calculateCommission(999, null, group)
    expect(result.amountCents).toBe(69)
  })

  it('should handle zero amountCents with fixed rule', () => {
    const rule: CommissionRule = {
      id: 'r1',
      name: 'Fixed $5',
      type: 'fixed',
      value: 500,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
    }
    const result = calculateCommission(0, rule, null)
    expect(result.amountCents).toBe(500)
    expect(result.rate).toBe(0) // division by zero guarded
  })
})

// ============================================================================
// processConversion
// ============================================================================

describe('processConversion', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should create a commission and update affiliate balance', async () => {
    const affiliate = await seedAffiliate(store)
    await seedRule(store) // 10% default

    const conversion: Conversion = {
      id: 'conv-1',
      affiliateId: affiliate.id,
      eventType: 'purchase',
      amountCents: 5000,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date(),
    }

    const commission = await processConversion(store, conversion, affiliate)

    expect(commission.amountCents).toBe(500) // 10% of 5000
    expect(commission.status).toBe('pending')
    expect(commission.affiliateId).toBe(affiliate.id)
    expect(commission.conversionId).toBe('conv-1')

    // Verify affiliate balance was updated
    const updatedAffiliate = await store.getAffiliate(affiliate.id)
    expect(updatedAffiliate!.balanceCents).toBe(500)
  })

  it('should create zero commission when no rule exists', async () => {
    const affiliate = await seedAffiliate(store)

    const conversion: Conversion = {
      id: 'conv-2',
      affiliateId: affiliate.id,
      eventType: 'purchase',
      amountCents: 5000,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date(),
    }

    const commission = await processConversion(store, conversion, affiliate)
    expect(commission.amountCents).toBe(0)
  })
})

// ============================================================================
// Tracking — generateAttributionKey, buildAttributionCookie, trackClick, trackConversion
// ============================================================================

describe('generateAttributionKey', () => {
  it('should return a 32-character hex string', () => {
    const key = generateAttributionKey()
    expect(key).toMatch(/^[0-9a-f]{32}$/)
  })

  it('should generate unique keys', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateAttributionKey()))
    expect(keys.size).toBe(50)
  })
})

describe('buildAttributionCookie', () => {
  it('should return valid JSON with required fields', () => {
    const cookie = buildAttributionCookie({
      referralCode: 'ABC123',
      affiliateId: 'aff-1',
      attributionKey: 'key-1',
    })

    const parsed = JSON.parse(cookie)
    expect(parsed.referral_code).toBe('ABC123')
    expect(parsed.affiliate_id).toBe('aff-1')
    expect(parsed.attribution_key).toBe('key-1')
    expect(parsed.timestamp).toBeTypeOf('number')
  })
})

describe('trackClick', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should create a click and return attribution key', async () => {
    await seedAffiliate(store)

    const result = await trackClick(store, {
      referralCode: 'ABC123',
      ipAddress: '10.0.0.1',
      userAgent: 'TestBot/1.0',
    })

    expect(result).not.toBeNull()
    expect(result!.click.affiliateId).toBeDefined()
    expect(result!.click.ipAddress).toBe('10.0.0.1')
    expect(result!.attributionKey).toMatch(/^[0-9a-f]{32}$/)
  })

  it('should return null for unknown referral code', async () => {
    const result = await trackClick(store, { referralCode: 'UNKNOWN' })
    expect(result).toBeNull()
  })

  it('should store the click in the store', async () => {
    const affiliate = await seedAffiliate(store)
    await trackClick(store, { referralCode: 'ABC123' })

    const clicks = await store.getClicksByAffiliate(affiliate.id)
    expect(clicks).toHaveLength(1)
  })
})

describe('trackConversion', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should create conversion and commission for valid referral code', async () => {
    const affiliate = await seedAffiliate(store)
    await seedRule(store) // 10%

    const result = await trackConversion(store, {
      referralCode: 'ABC123',
      eventType: 'purchase',
      amountCents: 10000,
    })

    expect(result).not.toBeNull()
    expect(result!.conversion.affiliateId).toBe(affiliate.id)
    expect(result!.conversion.amountCents).toBe(10000)
    expect(result!.conversion.currency).toBe('USD')
    expect(result!.conversion.status).toBe('pending')
    expect(result!.commission.amountCents).toBe(1000) // 10%
  })

  it('should return null for unknown referral code', async () => {
    const result = await trackConversion(store, {
      referralCode: 'UNKNOWN',
      eventType: 'purchase',
      amountCents: 1000,
    })
    expect(result).toBeNull()
  })

  it('should use provided currency', async () => {
    await seedAffiliate(store)
    await seedRule(store)

    const result = await trackConversion(store, {
      referralCode: 'ABC123',
      eventType: 'purchase',
      amountCents: 5000,
      currency: 'EUR',
    })

    expect(result!.conversion.currency).toBe('EUR')
  })

  it('should pass metadata and customerEmail to the conversion', async () => {
    await seedAffiliate(store)
    await seedRule(store)

    const result = await trackConversion(store, {
      referralCode: 'ABC123',
      eventType: 'signup',
      amountCents: 0,
      customerEmail: 'customer@test.com',
      metadata: { source: 'landing-page' },
    })

    expect(result!.conversion.customerEmail).toBe('customer@test.com')
    expect(result!.conversion.metadata).toEqual({ source: 'landing-page' })
  })
})

// ============================================================================
// Payouts — createPayout, updatePayoutStatus
// ============================================================================

describe('createPayout', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should create a payout from approved commissions', async () => {
    const affiliate = await seedAffiliate(store)
    const c1 = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 1000,
      rate: 0.1,
      status: 'approved',
    })
    const c2 = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 2000,
      rate: 0.1,
      status: 'approved',
    })

    const payout = await createPayout(store, {
      affiliateId: affiliate.id,
      commissionIds: [c1.id, c2.id],
      method: 'bank_transfer',
      notes: 'Monthly payout',
    })

    expect(payout.amountCents).toBe(3000)
    expect(payout.commissionCount).toBe(2)
    expect(payout.method).toBe('bank_transfer')
    expect(payout.status).toBe('pending')
    expect(payout.notes).toBe('Monthly payout')
  })

  it('should mark included commissions as paid', async () => {
    const affiliate = await seedAffiliate(store)
    const c1 = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 1000,
      rate: 0.1,
      status: 'approved',
    })

    await createPayout(store, {
      affiliateId: affiliate.id,
      commissionIds: [c1.id],
      method: 'paypal',
    })

    const commissions = await store.getCommissionsByAffiliate(affiliate.id)
    expect(commissions[0].status).toBe('paid')
    expect(commissions[0].paidAt).toBeInstanceOf(Date)
  })

  it('should throw if no approved commissions match the given IDs', async () => {
    const affiliate = await seedAffiliate(store)
    // Create a pending (not approved) commission
    const c1 = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 1000,
      rate: 0.1,
      status: 'pending',
    })

    await expect(
      createPayout(store, {
        affiliateId: affiliate.id,
        commissionIds: [c1.id],
        method: 'bank_transfer',
      })
    ).rejects.toThrow('No approved commissions found for the given IDs')
  })

  it('should throw if commission IDs do not exist', async () => {
    const affiliate = await seedAffiliate(store)

    await expect(
      createPayout(store, {
        affiliateId: affiliate.id,
        commissionIds: ['nonexistent-id'],
        method: 'stripe',
      })
    ).rejects.toThrow('No approved commissions found for the given IDs')
  })

  it('should only include approved commissions (skip pending ones)', async () => {
    const affiliate = await seedAffiliate(store)
    const approved = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 1000,
      rate: 0.1,
      status: 'approved',
    })
    const pending = await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 2000,
      rate: 0.1,
      status: 'pending',
    })

    const payout = await createPayout(store, {
      affiliateId: affiliate.id,
      commissionIds: [approved.id, pending.id],
      method: 'bank_transfer',
    })

    // Only the approved commission should be in the payout
    expect(payout.amountCents).toBe(1000)
    expect(payout.commissionCount).toBe(1)
  })
})

describe('updatePayoutStatus', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should update payout to processing', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id,
      amountCents: 5000,
      commissionCount: 2,
      method: 'bank_transfer',
      status: 'pending',
    })

    const updated = await updatePayoutStatus(store, payout.id, 'processing')
    expect(updated.status).toBe('processing')
  })

  it('should set processedAt when completing a payout', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id,
      amountCents: 5000,
      commissionCount: 2,
      method: 'bank_transfer',
      status: 'processing',
    })

    const updated = await updatePayoutStatus(store, payout.id, 'completed')
    expect(updated.status).toBe('completed')
    expect(updated.processedAt).toBeInstanceOf(Date)
  })

  it('should update with notes when provided', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id,
      amountCents: 5000,
      commissionCount: 2,
      method: 'bank_transfer',
      status: 'pending',
    })

    const updated = await updatePayoutStatus(store, payout.id, 'failed', 'Bank rejected transfer')
    expect(updated.status).toBe('failed')
    expect(updated.notes).toBe('Bank rejected transfer')
  })

  it('should not set processedAt when status is not completed', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id,
      amountCents: 5000,
      commissionCount: 2,
      method: 'bank_transfer',
      status: 'pending',
    })

    const updated = await updatePayoutStatus(store, payout.id, 'failed')
    expect(updated.processedAt).toBeUndefined()
  })
})

// ============================================================================
// Analytics — getAffiliateStats
// ============================================================================

describe('getAffiliateStats', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should return zeros for affiliate with no activity', async () => {
    const affiliate = await seedAffiliate(store)
    const stats = await getAffiliateStats(store, affiliate.id)

    expect(stats).toEqual({
      totalClicks: 0,
      totalConversions: 0,
      conversionRate: 0,
      totalEarningsCents: 0,
      pendingCommissionsCents: 0,
      paidCommissionsCents: 0,
    })
  })

  it('should aggregate clicks, conversions, and commissions correctly', async () => {
    const affiliate = await seedAffiliate(store)

    // 3 clicks
    await store.createClick({ affiliateId: affiliate.id })
    await store.createClick({ affiliateId: affiliate.id })
    await store.createClick({ affiliateId: affiliate.id })

    // 2 conversions
    await store.createConversion({
      affiliateId: affiliate.id,
      eventType: 'purchase',
      amountCents: 5000,
      currency: 'USD',
      status: 'pending',
    })
    await store.createConversion({
      affiliateId: affiliate.id,
      eventType: 'signup',
      amountCents: 0,
      currency: 'USD',
      status: 'pending',
    })

    // Commissions: 1 pending, 1 approved, 1 paid
    await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 500,
      rate: 0.1,
      status: 'pending',
    })
    await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 300,
      rate: 0.1,
      status: 'approved',
    })
    await store.createCommission({
      affiliateId: affiliate.id,
      amountCents: 200,
      rate: 0.1,
      status: 'paid',
    })

    const stats = await getAffiliateStats(store, affiliate.id)

    expect(stats.totalClicks).toBe(3)
    expect(stats.totalConversions).toBe(2)
    expect(stats.conversionRate).toBeCloseTo(2 / 3)
    expect(stats.totalEarningsCents).toBe(1000) // 500 + 300 + 200
    expect(stats.pendingCommissionsCents).toBe(800) // pending (500) + approved (300)
    expect(stats.paidCommissionsCents).toBe(200)
  })

  it('should handle zero clicks without division error', async () => {
    const affiliate = await seedAffiliate(store)
    // Add a conversion but no clicks
    await store.createConversion({
      affiliateId: affiliate.id,
      eventType: 'purchase',
      amountCents: 5000,
      currency: 'USD',
      status: 'pending',
    })

    const stats = await getAffiliateStats(store, affiliate.id)
    expect(stats.conversionRate).toBe(0)
    expect(stats.totalConversions).toBe(1)
  })
})

// ============================================================================
// Webhooks — signWebhookPayload, deliverWebhook, dispatchWebhook
// ============================================================================

describe('signWebhookPayload', () => {
  it('should produce a hex string', async () => {
    const signature = await signWebhookPayload('test-payload', 'my-secret')
    expect(signature).toMatch(/^[0-9a-f]+$/)
  })

  it('should produce consistent signatures for the same input', async () => {
    const sig1 = await signWebhookPayload('payload', 'secret')
    const sig2 = await signWebhookPayload('payload', 'secret')
    expect(sig1).toBe(sig2)
  })

  it('should produce different signatures for different payloads', async () => {
    const sig1 = await signWebhookPayload('payload-a', 'secret')
    const sig2 = await signWebhookPayload('payload-b', 'secret')
    expect(sig1).not.toBe(sig2)
  })

  it('should produce different signatures for different secrets', async () => {
    const sig1 = await signWebhookPayload('payload', 'secret-a')
    const sig2 = await signWebhookPayload('payload', 'secret-b')
    expect(sig1).not.toBe(sig2)
  })
})

describe('deliverWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should send a POST request with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })
    vi.stubGlobal('fetch', mockFetch)

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      events: ['commission.created'],
    }

    const result = await deliverWebhook(config, 'commission.created', { id: 'c1' })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://example.com/webhook')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['X-Webhook-Signature']).toBeDefined()
    expect(init.headers['X-Webhook-Event']).toBe('commission.created')
    expect(init.headers['X-Webhook-Id']).toBeDefined()
    expect(init.headers['X-Webhook-Timestamp']).toBeDefined()

    // Body should be valid JSON containing event and data
    const body = JSON.parse(init.body)
    expect(body.event).toBe('commission.created')
    expect(body.data).toEqual({ id: 'c1' })
    expect(body.timestamp).toBeTypeOf('number')
  })

  it('should return success false for non-ok responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    )

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      events: ['commission.created'],
    }

    const result = await deliverWebhook(config, 'commission.created', {})
    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(500)
  })

  it('should return error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    )

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      events: ['commission.created'],
    }

    const result = await deliverWebhook(config, 'commission.created', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })

  it('should handle non-Error thrown values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue('string error')
    )

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      events: ['commission.created'],
    }

    const result = await deliverWebhook(config, 'commission.created', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('string error')
  })
})

describe('dispatchWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should dispatch to all configs matching the event', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    const configs: WebhookConfig[] = [
      { url: 'https://a.com/hook', secret: 's1', events: ['commission.created'] },
      { url: 'https://b.com/hook', secret: 's2', events: ['commission.created', 'payout.completed'] },
      { url: 'https://c.com/hook', secret: 's3', events: ['payout.completed'] },
    ]

    const results = await dispatchWebhook(configs, 'commission.created', { id: 'c1' })

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should return empty array when no configs match the event', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const configs: WebhookConfig[] = [
      { url: 'https://a.com/hook', secret: 's1', events: ['payout.completed'] },
    ]

    const results = await dispatchWebhook(configs, 'commission.created', {})
    expect(results).toHaveLength(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should return empty array when configs list is empty', async () => {
    const results = await dispatchWebhook([], 'commission.created', {})
    expect(results).toHaveLength(0)
  })
})
