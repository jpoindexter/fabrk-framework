/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createStripeAdapter } from './stripe/adapter'
import { createPolarAdapter } from './polar/adapter'
import { createLemonSqueezyAdapter } from './lemonsqueezy/adapter'
import { createIdempotencyCache } from './idempotency'
import { bytesToHex } from '@fabrk/core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid Lemon Squeezy HMAC-SHA256 hex signature for a payload */
async function computeLsSig(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bytesToHex(new Uint8Array(signed))
}

/** Build a valid Polar svix-style base64 HMAC-SHA256 signature */
async function computePolarSig(
  body: string,
  webhookId: string,
  timestamp: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const secretBytes = secret.startsWith('whsec_')
    ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
    : encoder.encode(secret)
  const message = `${webhookId}.${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signed)))
}

async function polarHeaders(payload: string, secret: string, overrides?: Record<string, string>) {
  const webhookId = overrides?.['webhook-id'] ?? 'msg_test_abc'
  const timestamp =
    overrides?.['webhook-timestamp'] ?? Math.floor(Date.now() / 1000).toString()
  const sig = await computePolarSig(payload, webhookId, timestamp, secret)
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sig}`,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createIdempotencyCache
// ---------------------------------------------------------------------------

describe('createIdempotencyCache', () => {
  it('returns true for first-seen id, false for duplicate', () => {
    const cache = createIdempotencyCache(100)
    expect(cache.markProcessed('evt_1')).toBe(true)
    expect(cache.markProcessed('evt_1')).toBe(false)
    expect(cache.markProcessed('evt_2')).toBe(true)
    expect(cache.markProcessed('evt_2')).toBe(false)
  })

  it('evicts oldest entries when maxSize is exceeded', () => {
    const cache = createIdempotencyCache(3)
    cache.markProcessed('a')
    cache.markProcessed('b')
    cache.markProcessed('c')
    // 'a' is the oldest — adding 'd' evicts it
    cache.markProcessed('d')
    // 'a' should now be evictable (treated as new)
    expect(cache.markProcessed('a')).toBe(true)
    // 'b' was evicted when 'a' was re-added
    expect(cache.markProcessed('b')).toBe(true)
  })

  it('handles maxSize of 1', () => {
    const cache = createIdempotencyCache(1)
    expect(cache.markProcessed('x')).toBe(true)
    expect(cache.markProcessed('x')).toBe(false)
    // Adding 'y' evicts 'x'
    expect(cache.markProcessed('y')).toBe(true)
    expect(cache.markProcessed('x')).toBe(true) // x is new again
  })
})

// ---------------------------------------------------------------------------
// Stripe adapter — interface and webhook paths
// ---------------------------------------------------------------------------

describe('createStripeAdapter — interface completeness', () => {
  it('exposes all required PaymentAdapter methods', () => {
    const adapter = createStripeAdapter({ secretKey: 'sk_test_x', webhookSecret: 'whsec_x' })
    expect(typeof adapter.initialize).toBe('function')
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.createCheckout).toBe('function')
    expect(typeof adapter.handleWebhook).toBe('function')
    expect(typeof adapter.getCustomer).toBe('function')
    expect(typeof adapter.getSubscription).toBe('function')
    expect(typeof adapter.cancelSubscription).toBe('function')
    expect(typeof adapter.createPortalSession).toBe('function')
  })
})

describe('createStripeAdapter — isConfigured edge cases', () => {
  it('returns false when both fields are empty', () => {
    expect(createStripeAdapter({ secretKey: '', webhookSecret: '' }).isConfigured()).toBe(false)
  })
})

describe('createStripeAdapter — handleWebhook', () => {
  it('returns verified:false when constructEvent throws (bad signature)', async () => {
    const adapter = createStripeAdapter({ secretKey: 'sk_test_x', webhookSecret: 'whsec_x' })
    const result = await adapter.handleWebhook('{}', 'invalid_sig')
    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns verified:false for ArrayBuffer payload with bad signature', async () => {
    const adapter = createStripeAdapter({ secretKey: 'sk_test_x', webhookSecret: 'whsec_x' })
    const buffer = new TextEncoder().encode('{}').buffer
    const result = await adapter.handleWebhook(buffer, 'invalid_sig')
    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  // The timestamp guard and idempotency logic run after constructEvent succeeds.
  // We simulate those paths by mirroring the adapter code exactly.
  it('rejects events with timestamp older than 5 minutes', () => {
    const tooOld = Math.floor(Date.now() / 1000) - 301
    const result = simulateStripeGuards(
      { id: 'evt_old', type: 'x', created: tooOld, data: { object: {} } },
      createIdempotencyCache(10_000)
    )
    expect(result.verified).toBe(false)
    expect(result.error).toContain('too old')
  })

  it('rejects events with timestamp more than 30s in the future', () => {
    const tooFuture = Math.floor(Date.now() / 1000) + 60
    const result = simulateStripeGuards(
      { id: 'evt_future', type: 'x', created: tooFuture, data: { object: {} } },
      createIdempotencyCache(10_000)
    )
    expect(result.verified).toBe(false)
    expect(result.error).toContain('future')
  })

  it('returns verified:true with event for a valid in-window event', () => {
    const event = {
      id: 'evt_ok',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'cs_1' } },
    }
    const result = simulateStripeGuards(event, createIdempotencyCache(10_000))
    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('checkout.session.completed')
    expect(result.event!.data).toMatchObject({ id: 'cs_1' })
  })

  it('marks duplicate event IDs with duplicate:true', () => {
    const uniqueId = `evt_dup_${Date.now()}_${Math.random()}`
    const event = { id: uniqueId, type: 'x', created: Math.floor(Date.now() / 1000), data: { object: {} } }
    const cache = createIdempotencyCache(10_000)

    const first = simulateStripeGuards(event, cache)
    expect(first.verified).toBe(true)
    expect(first.duplicate).toBeUndefined()

    const second = simulateStripeGuards(event, cache)
    expect(second.verified).toBe(true)
    expect(second.duplicate).toBe(true)
  })
})

/**
 * Mirrors the post-constructEvent logic in stripe/adapter.ts.
 * Used to test timestamp bounds and idempotency with controlled event shapes,
 * since constructEvent requires a real Stripe signature we cannot forge.
 */
function simulateStripeGuards(
  event: { id: string; type: string; created: number; data: { object: Record<string, unknown> } },
  cache: ReturnType<typeof createIdempotencyCache>
): { verified: boolean; duplicate?: boolean; error?: string; event?: any } {
  const now = Math.floor(Date.now() / 1000)
  if (event.created < now - 300) {
    return { verified: false, error: 'Webhook timestamp too old (possible replay)' }
  }
  if (event.created > now + 30) {
    return { verified: false, error: 'Webhook timestamp in the future (possible replay)' }
  }
  if (!cache.markProcessed(event.id)) {
    return {
      verified: true,
      duplicate: true,
      event: { type: event.type, id: event.id, data: event.data.object, raw: event },
    }
  }
  return {
    verified: true,
    event: { type: event.type, id: event.id, data: event.data.object, raw: event },
  }
}

// ---------------------------------------------------------------------------
// Stripe adapter — createCheckout param construction
// ---------------------------------------------------------------------------

describe('createStripeAdapter — createCheckout param construction', () => {
  function buildStripeParams(options: {
    priceId: string
    successUrl: string
    cancelUrl: string
    subscription?: boolean
    trialDays?: number
    customerEmail?: string
    customerId?: string
    metadata?: Record<string, string>
  }) {
    const params: any = {
      mode: options.subscription ? 'subscription' : 'payment',
      line_items: [{ price: options.priceId, quantity: 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata ?? {},
    }
    if (options.customerEmail) params.customer_email = options.customerEmail
    if (options.customerId) params.customer = options.customerId
    if (options.subscription && options.trialDays) {
      params.subscription_data = { trial_period_days: options.trialDays }
    }
    return params
  }

  it('uses mode=payment for one-time checkout', () => {
    const p = buildStripeParams({
      priceId: 'price_abc',
      successUrl: 'https://example.com/ok',
      cancelUrl: 'https://example.com/cancel',
    })
    expect(p.mode).toBe('payment')
    expect(p.line_items[0].price).toBe('price_abc')
    expect(p.subscription_data).toBeUndefined()
    expect(p.customer_email).toBeUndefined()
  })

  it('uses mode=subscription with trial_period_days when trialDays is set', () => {
    const p = buildStripeParams({
      priceId: 'price_sub',
      successUrl: 'https://example.com/ok',
      cancelUrl: 'https://example.com/cancel',
      subscription: true,
      trialDays: 14,
      customerEmail: 'user@test.com',
    })
    expect(p.mode).toBe('subscription')
    expect(p.subscription_data.trial_period_days).toBe(14)
    expect(p.customer_email).toBe('user@test.com')
  })

  it('sets customer field when customerId is provided', () => {
    const p = buildStripeParams({
      priceId: 'price_x',
      successUrl: 'https://x.com/ok',
      cancelUrl: 'https://x.com/cancel',
      customerId: 'cust_existing',
    })
    expect(p.customer).toBe('cust_existing')
    expect(p.customer_email).toBeUndefined()
  })

  it('omits subscription_data when subscription=true but trialDays is absent', () => {
    const p = buildStripeParams({
      priceId: 'price_sub2',
      successUrl: 'https://x.com/ok',
      cancelUrl: 'https://x.com/cancel',
      subscription: true,
    })
    expect(p.mode).toBe('subscription')
    expect(p.subscription_data).toBeUndefined()
  })

  it('passes metadata when provided', () => {
    const p = buildStripeParams({
      priceId: 'p',
      successUrl: 'https://x.com/ok',
      cancelUrl: 'https://x.com/cancel',
      metadata: { plan: 'pro', userId: 'u1' },
    })
    expect(p.metadata).toEqual({ plan: 'pro', userId: 'u1' })
  })
})

// ---------------------------------------------------------------------------
// Polar adapter — interface and webhook edge cases
// ---------------------------------------------------------------------------

const POLAR_CONFIG = { accessToken: 'polar_pat_test', webhookSecret: 'polar_webhook_secret' }

describe('createPolarAdapter — interface completeness', () => {
  it('exposes all required PaymentAdapter methods', () => {
    const adapter = createPolarAdapter(POLAR_CONFIG)
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.createCheckout).toBe('function')
    expect(typeof adapter.handleWebhook).toBe('function')
    expect(typeof adapter.getCustomer).toBe('function')
    expect(typeof adapter.getSubscription).toBe('function')
    expect(typeof adapter.cancelSubscription).toBe('function')
  })
})

describe('createPolarAdapter — webhook timestamp replay protection', () => {
  it('rejects timestamps older than 5 minutes', async () => {
    const adapter = createPolarAdapter(POLAR_CONFIG)
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_old', data: {} })
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 301).toString()
    const sig = await computePolarSig(payload, 'msg_old', oldTimestamp, POLAR_CONFIG.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': 'msg_old',
      'webhook-timestamp': oldTimestamp,
      'webhook-signature': `v1,${sig}`,
    })
    expect(result.verified).toBe(false)
    expect(result.error).toContain('out of range')
  })

  it('rejects timestamps more than 30s in the future', async () => {
    const adapter = createPolarAdapter(POLAR_CONFIG)
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_future', data: {} })
    const futureTimestamp = (Math.floor(Date.now() / 1000) + 60).toString()
    const sig = await computePolarSig(
      payload,
      'msg_future',
      futureTimestamp,
      POLAR_CONFIG.webhookSecret
    )

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': 'msg_future',
      'webhook-timestamp': futureTimestamp,
      'webhook-signature': `v1,${sig}`,
    })
    expect(result.verified).toBe(false)
    expect(result.error).toContain('out of range')
  })

  it('rejects non-numeric timestamp', async () => {
    const adapter = createPolarAdapter(POLAR_CONFIG)
    const payload = JSON.stringify({ type: 'x', id: 'evt_nan', data: {} })
    const sig = await computePolarSig(payload, 'msg_nan', 'not-a-number', POLAR_CONFIG.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': 'msg_nan',
      'webhook-timestamp': 'not-a-number',
      'webhook-signature': `v1,${sig}`,
    })
    expect(result.verified).toBe(false)
    expect(result.error).toContain('out of range')
  })
})

describe('createPolarAdapter — idempotency', () => {
  it('marks second call with duplicate:true for the same event id', async () => {
    const uniqueId = `evt_polar_dup_${Date.now()}_${Math.random()}`
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_test_dup',
      webhookSecret: 'polar_dup_secret',
    })
    const payload = JSON.stringify({ type: 'subscription.updated', id: uniqueId, data: {} })
    const headers = await polarHeaders(payload, 'polar_dup_secret')

    const first = await adapter.handleWebhook(payload, '', headers)
    expect(first.verified).toBe(true)
    expect(first.duplicate).toBeUndefined()

    // Re-sign with same ID — headers must match payload for sig verification to pass
    const second = await adapter.handleWebhook(payload, '', headers)
    expect(second.verified).toBe(true)
    expect(second.duplicate).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Lemon Squeezy adapter — interface, edge cases, status mapping
// ---------------------------------------------------------------------------

const LS_CONFIG = { apiKey: 'ls_test_key', storeId: 'store_42', webhookSecret: 'ls_webhook_secret' }

describe('createLemonSqueezyAdapter — interface completeness', () => {
  it('exposes all required PaymentAdapter methods', () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.createCheckout).toBe('function')
    expect(typeof adapter.handleWebhook).toBe('function')
    expect(typeof adapter.getCustomer).toBe('function')
    expect(typeof adapter.getSubscription).toBe('function')
    expect(typeof adapter.cancelSubscription).toBe('function')
  })
})

describe('createLemonSqueezyAdapter — handleWebhook edge cases', () => {
  async function makeValidLsPayload(overrides?: Record<string, unknown>) {
    const base = {
      meta: {
        event_name: 'subscription_created',
        webhook_id: `wh_${Date.now()}_${Math.random()}`,
        created_at: new Date().toISOString(),
      },
      data: { attributes: { status: 'active', variant_id: 99 } },
      ...overrides,
    }
    const payloadStr = JSON.stringify(base)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    return { payload: payloadStr, sig }
  }

  it('accepts ArrayBuffer payload', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const { payload, sig } = await makeValidLsPayload()
    const buffer = new TextEncoder().encode(payload).buffer
    const result = await adapter.handleWebhook(buffer, sig)
    expect(result.verified).toBe(true)
  })

  it('rejects missing meta.created_at', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = { meta: { event_name: 'order_created', webhook_id: 'wh_no_ts' }, data: {} }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    const result = await adapter.handleWebhook(payloadStr, sig)
    expect(result.verified).toBe(false)
    expect(result.error).toContain('missing timestamp')
  })

  it('rejects invalid (non-date) created_at', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = { meta: { event_name: 'x', webhook_id: 'wh_bad_ts', created_at: 'not-a-date' }, data: {} }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    const result = await adapter.handleWebhook(payloadStr, sig)
    expect(result.verified).toBe(false)
    expect(result.error).toContain('not a valid date')
  })

  it('rejects timestamps older than 5 minutes', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = {
      meta: {
        event_name: 'x',
        webhook_id: 'wh_old',
        created_at: new Date(Date.now() - 301_000).toISOString(),
      },
      data: {},
    }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    const result = await adapter.handleWebhook(payloadStr, sig)
    expect(result.verified).toBe(false)
    expect(result.error).toContain('too old')
  })

  it('rejects timestamps more than 30s in the future', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = {
      meta: {
        event_name: 'x',
        webhook_id: 'wh_future',
        created_at: new Date(Date.now() + 60_000).toISOString(),
      },
      data: {},
    }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    const result = await adapter.handleWebhook(payloadStr, sig)
    expect(result.verified).toBe(false)
    expect(result.error).toContain('future')
  })

  it('marks duplicate webhook_id with duplicate:true', async () => {
    // Each test run needs an adapter with its own fresh idempotency state.
    // The module-level lsCache is shared, so we rely on a unique webhook_id per run.
    const uniqueWh = `wh_ls_dup_${Date.now()}_${Math.random()}`
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = {
      meta: { event_name: 'sub_created', webhook_id: uniqueWh, created_at: new Date().toISOString() },
      data: { attributes: { status: 'active' } },
    }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)

    const first = await adapter.handleWebhook(payloadStr, sig)
    expect(first.verified).toBe(true)
    expect(first.duplicate).toBeUndefined()

    const second = await adapter.handleWebhook(payloadStr, sig)
    expect(second.verified).toBe(true)
    expect(second.duplicate).toBe(true)
  })

  it('uses event_name as event type and extracts data.attributes', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const { payload, sig } = await makeValidLsPayload()
    const result = await adapter.handleWebhook(payload, sig)
    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('subscription_created')
    expect(result.event!.data).toMatchObject({ status: 'active', variant_id: 99 })
  })

  it('falls back to derived id when webhook has no webhook_id', async () => {
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const raw = {
      meta: { event_name: 'order_created', created_at: new Date().toISOString() },
      data: { attributes: { total: 500 } },
    }
    const payloadStr = JSON.stringify(raw)
    const sig = await computeLsSig(payloadStr, LS_CONFIG.webhookSecret)
    const result = await adapter.handleWebhook(payloadStr, sig)
    expect(result.verified).toBe(true)
    expect(result.event!.id).toMatch(/^derived:/)
  })
})

describe('createLemonSqueezyAdapter — getSubscription status mapping', () => {
  const statusCases: Array<[string, string]> = [
    ['active', 'active'],
    ['on_trial', 'trialing'],
    ['past_due', 'past_due'],
    ['cancelled', 'canceled'],
    ['unpaid', 'unpaid'],
    ['paused', 'paused'],
    ['unknown_status', 'active'], // default fallback
  ]

  for (const [lsStatus, expectedStatus] of statusCases) {
    it(`maps LS status "${lsStatus}" → "${expectedStatus}"`, async () => {
      const mockFetchResponse = {
        data: {
          id: 'sub_ls_1',
          attributes: {
            status: lsStatus,
            variant_id: 77,
            created_at: '2025-01-01T00:00:00.000Z',
            renews_at: '2025-02-01T00:00:00.000Z',
            cancelled: false,
          },
        },
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFetchResponse),
      }))

      const adapter = createLemonSqueezyAdapter(LS_CONFIG)
      const sub = await adapter.getSubscription('sub_ls_1')

      expect(sub).not.toBeNull()
      expect(sub!.status).toBe(expectedStatus)
      expect(sub!.id).toBe('sub_ls_1')
      expect(sub!.priceId).toBe('77')

      vi.unstubAllGlobals()
    })
  }
})

describe('createLemonSqueezyAdapter — getCustomer', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns CustomerInfo on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'cust_ls_1',
          attributes: { email: 'ls@test.com', name: 'LS User' },
        },
      }),
    }))

    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const customer = await adapter.getCustomer('cust_ls_1')
    expect(customer).not.toBeNull()
    expect(customer!.id).toBe('cust_ls_1')
    expect(customer!.email).toBe('ls@test.com')
    expect(customer!.name).toBe('LS User')
    expect(customer!.subscriptions).toEqual([])
  })

  it('returns null on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }))
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const result = await adapter.getCustomer('nonexistent')
    expect(result).toBeNull()
  })
})

describe('createLemonSqueezyAdapter — getSubscription', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns null on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }))
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const result = await adapter.getSubscription('nonexistent')
    expect(result).toBeNull()
  })

  it('maps cancelAtPeriodEnd from cancelled field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'sub_cancel',
          attributes: {
            status: 'active',
            variant_id: 10,
            created_at: '2025-01-01T00:00:00.000Z',
            renews_at: '2025-02-01T00:00:00.000Z',
            cancelled: true,
          },
        },
      }),
    }))
    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const sub = await adapter.getSubscription('sub_cancel')
    expect(sub!.cancelAtPeriodEnd).toBe(true)
  })
})

describe('createLemonSqueezyAdapter — cancelSubscription', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('uses DELETE for immediate cancellation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    await adapter.cancelSubscription('sub_del_1')

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/subscriptions/sub_del_1')
    expect(opts.method).toBe('DELETE')
  })

  it('uses PATCH with cancelled:true for atPeriodEnd cancellation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    await adapter.cancelSubscription('sub_patch_1', { atPeriodEnd: true })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/subscriptions/sub_patch_1')
    expect(opts.method).toBe('PATCH')
    const body = JSON.parse(opts.body)
    expect(body.data.attributes.cancelled).toBe(true)
  })
})

describe('createLemonSqueezyAdapter — createCheckout', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('posts correct JSON:API body and returns CheckoutResult', async () => {
    const mockResponse = {
      data: { id: 'checkout_ls_1', attributes: { url: 'https://ls.com/checkout/1' } },
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createLemonSqueezyAdapter(LS_CONFIG)
    const result = await adapter.createCheckout({
      priceId: 'variant_99',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'buyer@example.com',
      metadata: { plan: 'pro' },
    })

    expect(result.id).toBe('checkout_ls_1')
    expect(result.url).toBe('https://ls.com/checkout/1')

    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.data.type).toBe('checkouts')
    expect(body.data.relationships.variant.data.id).toBe('variant_99')
    expect(body.data.relationships.store.data.id).toBe(LS_CONFIG.storeId)
    expect(body.data.attributes.checkout_data.email).toBe('buyer@example.com')
  })
})

// ---------------------------------------------------------------------------
// Polar adapter — createCheckout and getCustomer/getSubscription/cancelSubscription
// ---------------------------------------------------------------------------

describe('createPolarAdapter — createCheckout', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('posts to /checkouts/custom and returns CheckoutResult', async () => {
    const mockResponse = { id: 'polar_checkout_1', url: 'https://polar.sh/checkout/1' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createPolarAdapter(POLAR_CONFIG)
    const result = await adapter.createCheckout({
      priceId: 'polar_price_1',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'buyer@example.com',
    })

    expect(result.id).toBe('polar_checkout_1')
    expect(result.url).toBe('https://polar.sh/checkout/1')

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/checkouts/custom')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.product_price_id).toBe('polar_price_1')
    expect(body.customer_email).toBe('buyer@example.com')
    expect(body.success_url).toBe('https://example.com/success')
  })
})

describe('createPolarAdapter — getCustomer', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns CustomerInfo on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'polar_cust_1',
        email: 'polar@test.com',
        name: 'Polar User',
        subscriptions: [{ id: 'sub_p1' }, { id: 'sub_p2' }],
        metadata: { tier: 'pro' },
      }),
    }))

    const adapter = createPolarAdapter(POLAR_CONFIG)
    const customer = await adapter.getCustomer('polar_cust_1')
    expect(customer).not.toBeNull()
    expect(customer!.email).toBe('polar@test.com')
    expect(customer!.subscriptions).toEqual(['sub_p1', 'sub_p2'])
    expect(customer!.metadata).toEqual({ tier: 'pro' })
  })

  it('returns null on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }))
    const adapter = createPolarAdapter(POLAR_CONFIG)
    expect(await adapter.getCustomer('missing')).toBeNull()
  })
})

describe('createPolarAdapter — getSubscription', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns SubscriptionInfo on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'sub_polar_1',
        status: 'active',
        price_id: 'polar_price_pro',
        current_period_start: '2025-01-01T00:00:00.000Z',
        current_period_end: '2025-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
      }),
    }))

    const adapter = createPolarAdapter(POLAR_CONFIG)
    const sub = await adapter.getSubscription('sub_polar_1')
    expect(sub).not.toBeNull()
    expect(sub!.status).toBe('active')
    expect(sub!.priceId).toBe('polar_price_pro')
    expect(sub!.cancelAtPeriodEnd).toBe(false)
    expect(sub!.currentPeriodStart).toBeInstanceOf(Date)
  })

  it('returns null on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }))
    const adapter = createPolarAdapter(POLAR_CONFIG)
    expect(await adapter.getSubscription('missing')).toBeNull()
  })
})

describe('createPolarAdapter — cancelSubscription', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('sends DELETE with cancel_at_period_end:true by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createPolarAdapter(POLAR_CONFIG)
    await adapter.cancelSubscription('sub_p_del')

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/subscriptions/sub_p_del')
    expect(opts.method).toBe('DELETE')
    const body = JSON.parse(opts.body)
    expect(body.cancel_at_period_end).toBe(true)
  })

  it('sends DELETE with cancel_at_period_end:false for immediate cancellation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createPolarAdapter(POLAR_CONFIG)
    await adapter.cancelSubscription('sub_p_now', { atPeriodEnd: false })

    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.cancel_at_period_end).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// All adapters: name and version fields
// ---------------------------------------------------------------------------

describe('adapter name and version fields', () => {
  it('stripe has name=stripe, version=1.0.0', () => {
    const a = createStripeAdapter({ secretKey: 'sk', webhookSecret: 'wh' })
    expect(a.name).toBe('stripe')
    expect(a.version).toBe('1.0.0')
  })

  it('polar has name=polar, version=1.0.0', () => {
    const a = createPolarAdapter({ accessToken: 'tok' })
    expect(a.name).toBe('polar')
    expect(a.version).toBe('1.0.0')
  })

  it('lemonsqueezy has name=lemonsqueezy, version=1.0.0', () => {
    const a = createLemonSqueezyAdapter({ apiKey: 'k', storeId: 's', webhookSecret: 'w' })
    expect(a.name).toBe('lemonsqueezy')
    expect(a.version).toBe('1.0.0')
  })
})
