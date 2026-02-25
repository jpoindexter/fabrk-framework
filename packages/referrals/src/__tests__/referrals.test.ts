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

function makeRule(overrides: Partial<CommissionRule> = {}): CommissionRule {
  return {
    id: 'r1',
    name: '10%',
    type: 'percentage',
    value: 10,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================================================
// InMemoryReferralStore
// ============================================================================

describe('InMemoryReferralStore', () => {
  let store: InMemoryReferralStore

  beforeEach(() => {
    store = new InMemoryReferralStore()
  })

  it('should round-trip affiliate by id, code, and userId', async () => {
    const affiliate = await seedAffiliate(store)

    expect((await store.getAffiliate(affiliate.id))!.referralCode).toBe('ABC123')
    expect((await store.getAffiliateByCode('ABC123'))!.userId).toBe('user-1')
    expect((await store.getAffiliateByUserId('user-1'))!.referralCode).toBe('ABC123')
  })

  it('should return null for nonexistent lookups', async () => {
    expect(await store.getAffiliate('nope')).toBeNull()
    expect(await store.getAffiliateByCode('nope')).toBeNull()
    expect(await store.getAffiliateByUserId('nope')).toBeNull()
  })

  it('should update an affiliate and throw for nonexistent', async () => {
    const affiliate = await seedAffiliate(store)
    const updated = await store.updateAffiliate(affiliate.id, { balanceCents: 5000 })
    expect(updated.balanceCents).toBe(5000)

    await expect(store.updateAffiliate('nope', { balanceCents: 0 })).rejects.toThrow('not found')
  })

  it('should round-trip referrals with create, get, update, and list', async () => {
    const a1 = await seedAffiliate(store, { referralCode: 'A', userId: 'u1' })
    const a2 = await seedAffiliate(store, { referralCode: 'B', userId: 'u2' })

    const referral = await store.createReferral({ affiliateId: a1.id, status: 'pending', leadEmail: 'lead@test.com' })
    await store.createReferral({ affiliateId: a1.id, status: 'pending' })
    await store.createReferral({ affiliateId: a2.id, status: 'pending' })

    expect((await store.getReferral(referral.id))!.leadEmail).toBe('lead@test.com')
    expect(await store.getReferral('nope')).toBeNull()

    const updated = await store.updateReferral(referral.id, { status: 'approved' })
    expect(updated.status).toBe('approved')
    await expect(store.updateReferral('nope', { status: 'approved' })).rejects.toThrow('not found')

    expect(await store.listReferralsByAffiliate(a1.id)).toHaveLength(2)
  })

  it('should create clicks and conversions', async () => {
    const affiliate = await seedAffiliate(store)

    const click = await store.createClick({ affiliateId: affiliate.id, ipAddress: '1.2.3.4', attributionKey: 'abc' })
    expect(click.id).toBeDefined()
    expect(await store.getClicksByAffiliate(affiliate.id)).toHaveLength(1)

    const conversion = await store.createConversion({
      affiliateId: affiliate.id, eventType: 'purchase', amountCents: 9900, currency: 'USD', status: 'pending',
    })
    expect(conversion.id).toBeDefined()
    expect(await store.getConversionsByAffiliate(affiliate.id)).toHaveLength(1)
  })

  it('should create, update, and filter commissions by status', async () => {
    const affiliate = await seedAffiliate(store)

    const c1 = await store.createCommission({ affiliateId: affiliate.id, amountCents: 100, rate: 0.1, status: 'pending' })
    await store.createCommission({ affiliateId: affiliate.id, amountCents: 200, rate: 0.1, status: 'approved' })

    const updated = await store.updateCommission(c1.id, { status: 'approved' })
    expect(updated.status).toBe('approved')
    await expect(store.updateCommission('nope', { status: 'approved' })).rejects.toThrow('not found')

    expect(await store.getCommissionsByAffiliate(affiliate.id)).toHaveLength(2)
  })

  it('should manage commission rules with active filter and default lookup', async () => {
    await seedRule(store)
    await store.createCommissionRule({ name: 'Inactive', type: 'fixed', value: 500, isDefault: false, isActive: false })
    await store.createCommissionRule({ name: 'Non-default', type: 'fixed', value: 500, isDefault: false, isActive: true })

    expect(await store.getCommissionRules()).toHaveLength(2)
    expect((await store.getDefaultRule())!.isDefault).toBe(true)
  })

  it('should create and update payouts, and throw for nonexistent', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id, amountCents: 5000, commissionCount: 3, method: 'bank_transfer', status: 'pending',
    })
    expect(payout.id).toBeDefined()

    const updated = await store.updatePayout(payout.id, { status: 'completed' })
    expect(updated.status).toBe('completed')
    await expect(store.updatePayout('nope', { status: 'completed' })).rejects.toThrow('not found')

    expect(await store.getPayoutsByAffiliate(affiliate.id)).toHaveLength(1)
  })
})

// ============================================================================
// calculateCommission
// ============================================================================

describe('calculateCommission', () => {
  it('should calculate percentage commission', () => {
    const result = calculateCommission(10000, makeRule({ type: 'percentage', value: 10 }), null)
    expect(result.amountCents).toBe(1000)
    expect(result.rate).toBe(0.1)
  })

  it('should calculate fixed commission', () => {
    const result = calculateCommission(10000, makeRule({ type: 'fixed', value: 500 }), null)
    expect(result.amountCents).toBe(500)
    expect(result.rate).toBe(500 / 10000)
  })

  it('should use partner group rate when present (overrides rule)', () => {
    const group: PartnerGroup = { id: 'g1', name: 'Premium', commissionRate: 0.2, isDefault: false, createdAt: new Date() }
    const result = calculateCommission(10000, makeRule(), group)
    expect(result.amountCents).toBe(2000)
    expect(result.rate).toBe(0.2)
  })

  it('should return 0 when no rule and no partner group', () => {
    const result = calculateCommission(10000, null, null)
    expect(result.amountCents).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('should floor fractional cent amounts', () => {
    expect(calculateCommission(999, makeRule({ type: 'percentage', value: 15 }), null).amountCents).toBe(149)

    const group: PartnerGroup = { id: 'g1', name: 'Bronze', commissionRate: 0.07, isDefault: false, createdAt: new Date() }
    expect(calculateCommission(999, null, group).amountCents).toBe(69)
  })

  it('should handle zero amountCents with fixed rule', () => {
    const result = calculateCommission(0, makeRule({ type: 'fixed', value: 500 }), null)
    expect(result.amountCents).toBe(500)
    expect(result.rate).toBe(0)
  })
})

// ============================================================================
// processConversion
// ============================================================================

describe('processConversion', () => {
  let store: InMemoryReferralStore

  beforeEach(() => { store = new InMemoryReferralStore() })

  it('should create commission and update affiliate balance', async () => {
    const affiliate = await seedAffiliate(store)
    await seedRule(store)

    const conversion: Conversion = {
      id: 'conv-1', affiliateId: affiliate.id, eventType: 'purchase',
      amountCents: 5000, currency: 'USD', status: 'pending', createdAt: new Date(),
    }

    const commission = await processConversion(store, conversion, affiliate)
    expect(commission.amountCents).toBe(500)
    expect(commission.conversionId).toBe('conv-1')
    expect((await store.getAffiliate(affiliate.id))!.balanceCents).toBe(500)
  })

  it('should create zero commission when no rule exists', async () => {
    const affiliate = await seedAffiliate(store)
    const conversion: Conversion = {
      id: 'conv-2', affiliateId: affiliate.id, eventType: 'purchase',
      amountCents: 5000, currency: 'USD', status: 'pending', createdAt: new Date(),
    }
    expect((await processConversion(store, conversion, affiliate)).amountCents).toBe(0)
  })
})

// ============================================================================
// Tracking
// ============================================================================

describe('tracking', () => {
  let store: InMemoryReferralStore
  beforeEach(() => { store = new InMemoryReferralStore() })

  it('generateAttributionKey returns unique 32-char hex strings', () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateAttributionKey()))
    expect(keys.size).toBe(10)
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{32}$/)
  })

  it('buildAttributionCookie returns valid JSON with required fields', () => {
    const parsed = JSON.parse(buildAttributionCookie({ referralCode: 'ABC123', affiliateId: 'aff-1', attributionKey: 'key-1' }))
    expect(parsed.referral_code).toBe('ABC123')
    expect(parsed.affiliate_id).toBe('aff-1')
    expect(parsed.attribution_key).toBe('key-1')
    expect(parsed.timestamp).toBeTypeOf('number')
  })

  it('trackClick should create a click and return attribution key, or null for unknown code', async () => {
    await seedAffiliate(store)
    const result = await trackClick(store, { referralCode: 'ABC123', ipAddress: '10.0.0.1' })
    expect(result).not.toBeNull()
    expect(result!.click.ipAddress).toBe('10.0.0.1')
    expect(result!.attributionKey).toMatch(/^[0-9a-f]{32}$/)

    expect(await trackClick(store, { referralCode: 'UNKNOWN' })).toBeNull()
  })

  it('trackConversion should create conversion and commission, or null for unknown code', async () => {
    await seedAffiliate(store)
    await seedRule(store)

    const result = await trackConversion(store, { referralCode: 'ABC123', eventType: 'purchase', amountCents: 10000 })
    expect(result).not.toBeNull()
    expect(result!.conversion.amountCents).toBe(10000)
    expect(result!.commission.amountCents).toBe(1000)

    expect(await trackConversion(store, { referralCode: 'UNKNOWN', eventType: 'purchase', amountCents: 1000 })).toBeNull()
  })

  it('trackConversion should pass currency, metadata, and customerEmail', async () => {
    await seedAffiliate(store)
    await seedRule(store)

    const result = await trackConversion(store, {
      referralCode: 'ABC123', eventType: 'signup', amountCents: 0,
      currency: 'EUR', customerEmail: 'c@test.com', metadata: { source: 'landing' },
    })

    expect(result!.conversion.currency).toBe('EUR')
    expect(result!.conversion.customerEmail).toBe('c@test.com')
    expect(result!.conversion.metadata).toEqual({ source: 'landing' })
  })
})

// ============================================================================
// Payouts
// ============================================================================

describe('createPayout', () => {
  let store: InMemoryReferralStore
  beforeEach(() => { store = new InMemoryReferralStore() })

  it('should create payout from approved commissions and mark them paid', async () => {
    const affiliate = await seedAffiliate(store)
    const c1 = await store.createCommission({ affiliateId: affiliate.id, amountCents: 1000, rate: 0.1, status: 'approved' })
    const c2 = await store.createCommission({ affiliateId: affiliate.id, amountCents: 2000, rate: 0.1, status: 'approved' })

    const payout = await createPayout(store, {
      affiliateId: affiliate.id, commissionIds: [c1.id, c2.id], method: 'bank_transfer', notes: 'Monthly payout',
    })

    expect(payout.amountCents).toBe(3000)
    expect(payout.commissionCount).toBe(2)
    expect(payout.status).toBe('pending')

    const commissions = await store.getCommissionsByAffiliate(affiliate.id)
    expect(commissions.every(c => c.status === 'paid')).toBe(true)
  })

  it('should throw for non-approved or nonexistent commission IDs', async () => {
    const affiliate = await seedAffiliate(store)
    const pending = await store.createCommission({ affiliateId: affiliate.id, amountCents: 1000, rate: 0.1, status: 'pending' })

    await expect(createPayout(store, {
      affiliateId: affiliate.id, commissionIds: [pending.id], method: 'bank_transfer',
    })).rejects.toThrow('No approved commissions found')

    await expect(createPayout(store, {
      affiliateId: affiliate.id, commissionIds: ['nonexistent'], method: 'stripe',
    })).rejects.toThrow('No approved commissions found')
  })

  it('should only include approved commissions (skip pending ones)', async () => {
    const affiliate = await seedAffiliate(store)
    const approved = await store.createCommission({ affiliateId: affiliate.id, amountCents: 1000, rate: 0.1, status: 'approved' })
    const pending = await store.createCommission({ affiliateId: affiliate.id, amountCents: 2000, rate: 0.1, status: 'pending' })

    const payout = await createPayout(store, {
      affiliateId: affiliate.id, commissionIds: [approved.id, pending.id], method: 'bank_transfer',
    })
    expect(payout.amountCents).toBe(1000)
    expect(payout.commissionCount).toBe(1)
  })
})

describe('updatePayoutStatus', () => {
  let store: InMemoryReferralStore
  beforeEach(() => { store = new InMemoryReferralStore() })

  it('should update status and set processedAt only on completion', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id, amountCents: 5000, commissionCount: 2, method: 'bank_transfer', status: 'pending',
    })

    const processing = await updatePayoutStatus(store, payout.id, 'processing')
    expect(processing.status).toBe('processing')
    expect(processing.processedAt).toBeUndefined()

    const completed = await updatePayoutStatus(store, payout.id, 'completed')
    expect(completed.status).toBe('completed')
    expect(completed.processedAt).toBeInstanceOf(Date)
  })

  it('should update with notes when provided', async () => {
    const affiliate = await seedAffiliate(store)
    const payout = await store.createPayout({
      affiliateId: affiliate.id, amountCents: 5000, commissionCount: 2, method: 'bank_transfer', status: 'pending',
    })

    const updated = await updatePayoutStatus(store, payout.id, 'failed', 'Bank rejected transfer')
    expect(updated.status).toBe('failed')
    expect(updated.notes).toBe('Bank rejected transfer')
  })
})

// ============================================================================
// Analytics
// ============================================================================

describe('getAffiliateStats', () => {
  let store: InMemoryReferralStore
  beforeEach(() => { store = new InMemoryReferralStore() })

  it('should aggregate clicks, conversions, and commissions correctly', async () => {
    const affiliate = await seedAffiliate(store)

    await store.createClick({ affiliateId: affiliate.id })
    await store.createClick({ affiliateId: affiliate.id })
    await store.createClick({ affiliateId: affiliate.id })

    await store.createConversion({ affiliateId: affiliate.id, eventType: 'purchase', amountCents: 5000, currency: 'USD', status: 'pending' })
    await store.createConversion({ affiliateId: affiliate.id, eventType: 'signup', amountCents: 0, currency: 'USD', status: 'pending' })

    await store.createCommission({ affiliateId: affiliate.id, amountCents: 500, rate: 0.1, status: 'pending' })
    await store.createCommission({ affiliateId: affiliate.id, amountCents: 300, rate: 0.1, status: 'approved' })
    await store.createCommission({ affiliateId: affiliate.id, amountCents: 200, rate: 0.1, status: 'paid' })

    const stats = await getAffiliateStats(store, affiliate.id)
    expect(stats.totalClicks).toBe(3)
    expect(stats.totalConversions).toBe(2)
    expect(stats.conversionRate).toBeCloseTo(2 / 3)
    expect(stats.totalEarningsCents).toBe(1000)
    expect(stats.pendingCommissionsCents).toBe(800)
    expect(stats.paidCommissionsCents).toBe(200)
  })

  it('should return zeros for no activity and handle zero clicks without division error', async () => {
    const affiliate = await seedAffiliate(store)

    const empty = await getAffiliateStats(store, affiliate.id)
    expect(empty.totalClicks).toBe(0)
    expect(empty.conversionRate).toBe(0)

    await store.createConversion({ affiliateId: affiliate.id, eventType: 'purchase', amountCents: 5000, currency: 'USD', status: 'pending' })
    const noClicks = await getAffiliateStats(store, affiliate.id)
    expect(noClicks.conversionRate).toBe(0)
    expect(noClicks.totalConversions).toBe(1)
  })
})

// ============================================================================
// Webhooks
// ============================================================================

describe('signWebhookPayload', () => {
  it('should produce consistent hex signatures, different for different inputs', async () => {
    const sig1 = await signWebhookPayload('payload', 'secret')
    const sig2 = await signWebhookPayload('payload', 'secret')
    expect(sig1).toMatch(/^[0-9a-f]+$/)
    expect(sig1).toBe(sig2)

    expect(await signWebhookPayload('payload-a', 'secret')).not.toBe(await signWebhookPayload('payload-b', 'secret'))
    expect(await signWebhookPayload('payload', 'secret-a')).not.toBe(await signWebhookPayload('payload', 'secret-b'))
  })
})

describe('deliverWebhook', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('should POST with correct headers and body on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    const config: WebhookConfig = { url: 'https://example.com/webhook', secret: 'test-secret', events: ['commission.created'] }
    const result = await deliverWebhook(config, 'commission.created', { id: 'c1' })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://example.com/webhook')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Webhook-Event']).toBe('commission.created')
    expect(JSON.parse(init.body).data).toEqual({ id: 'c1' })
  })

  it('should handle non-ok responses and fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const config: WebhookConfig = { url: 'https://example.com/webhook', secret: 'test-secret', events: ['commission.created'] }

    const nonOk = await deliverWebhook(config, 'commission.created', {})
    expect(nonOk.success).toBe(false)
    expect(nonOk.statusCode).toBe(500)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const netErr = await deliverWebhook(config, 'commission.created', {})
    expect(netErr.success).toBe(false)
    expect(netErr.error).toBe('Network error')
  })
})

describe('dispatchWebhook', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('should dispatch to matching configs and skip non-matching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    const configs: WebhookConfig[] = [
      { url: 'https://a.com/hook', secret: 's1', events: ['commission.created'] },
      { url: 'https://b.com/hook', secret: 's2', events: ['commission.created', 'payout.completed'] },
      { url: 'https://c.com/hook', secret: 's3', events: ['payout.completed'] },
    ]

    const results = await dispatchWebhook(configs, 'commission.created', { id: 'c1' })
    expect(results).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    expect(await dispatchWebhook([], 'commission.created', {})).toHaveLength(0)
  })
})
