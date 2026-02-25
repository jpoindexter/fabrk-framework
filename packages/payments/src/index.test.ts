import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStripeAdapter } from './stripe/adapter'
import { createPolarAdapter } from './polar/adapter'
import { createLemonSqueezyAdapter } from './lemonsqueezy/adapter'
import { InMemoryPaymentStore } from './types'

/** Compute a valid svix-style HMAC-SHA256 signature for Polar webhook tests */
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
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signed)))
}

/** Build valid Polar webhook headers for a payload */
async function polarWebhookHeaders(payload: string, secret: string) {
  const webhookId = 'msg_test_' + Math.random().toString(36).slice(2, 8)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const sig = await computePolarSig(payload, webhookId, timestamp, secret)
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sig}`,
  }
}

// ---------------------------------------------------------------------------
// Stripe Adapter
// ---------------------------------------------------------------------------

describe('createStripeAdapter', () => {
  const validConfig = {
    secretKey: 'sk_test_abc123',
    webhookSecret: 'whsec_test_xyz',
  }

  it('should return a named adapter with correct version', () => {
    const adapter = createStripeAdapter(validConfig)
    expect(adapter.name).toBe('stripe')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should report not configured when secretKey is empty', () => {
    const adapter = createStripeAdapter({ secretKey: '', webhookSecret: 'whsec_test' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should report not configured when webhookSecret is empty', () => {
    const adapter = createStripeAdapter({ secretKey: 'sk_test_abc', webhookSecret: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should have an initialize method that validates stripe availability', async () => {
    const adapter = createStripeAdapter(validConfig)
    expect(typeof adapter.initialize).toBe('function')

    // Stripe is installed as a dev dependency, so initialize should succeed
    await expect(adapter.initialize!()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Polar Adapter
// ---------------------------------------------------------------------------

describe('createPolarAdapter', () => {
  const validConfig = {
    accessToken: 'polar_pat_abc123',
    webhookSecret: 'test_basic_webhook_secret',
  }

  it('should return a named adapter with correct version', () => {
    const adapter = createPolarAdapter(validConfig)
    expect(adapter.name).toBe('polar')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should report not configured when accessToken is empty', () => {
    const adapter = createPolarAdapter({ accessToken: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should handle valid JSON webhook payload', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = JSON.stringify({
      type: 'subscription.created',
      id: 'evt_123',
      data: { subscription_id: 'sub_abc' },
    })
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)

    expect(result.verified).toBe(true)
    expect(result.event).toBeDefined()
    expect(result.event!.type).toBe('subscription.created')
    expect(result.event!.id).toBe('evt_123')
    expect(result.event!.data).toEqual({ subscription_id: 'sub_abc' })
  })

  it('should handle ArrayBuffer webhook payload', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = JSON.stringify({
      type: 'checkout.completed',
      id: 'evt_456',
      data: { amount: 1000 },
    })
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)
    const buffer = new TextEncoder().encode(payload).buffer

    const result = await adapter.handleWebhook(buffer, '', headers)

    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('checkout.completed')
  })

  it('should return unverified result for invalid JSON webhook', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = 'not valid json'
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)

    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should generate an id when webhook event has no id', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = JSON.stringify({
      type: 'subscription.updated',
      data: { status: 'active' },
    })
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)

    expect(result.verified).toBe(true)
    expect(result.event!.id).toBeDefined()
    expect(typeof result.event!.id).toBe('string')
    expect(result.event!.id.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Polar Webhook Signature Verification
// ---------------------------------------------------------------------------

describe('Polar webhook signature verification', () => {
  const webhookSecret = 'test_polar_webhook_secret'

  it('should verify a valid webhook signature', async () => {
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      webhookSecret,
    })

    const payload = JSON.stringify({
      type: 'subscription.created',
      id: 'evt_sig_1',
      data: { subscription_id: 'sub_xyz' },
    })

    const webhookId = 'msg_abc123'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = await computePolarSig(payload, webhookId, timestamp, webhookSecret)

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    })

    expect(result.verified).toBe(true)
    expect(result.event).toBeDefined()
    expect(result.event!.type).toBe('subscription.created')
    expect(result.event!.id).toBe('evt_sig_1')
  })

  it('should verify when signature header contains multiple signatures', async () => {
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      webhookSecret,
    })

    const payload = JSON.stringify({
      type: 'checkout.completed',
      id: 'evt_multi',
      data: { amount: 2500 },
    })

    const webhookId = 'msg_multi'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const validSig = await computePolarSig(payload, webhookId, timestamp, webhookSecret)

    // Multiple signatures: first is wrong, second is correct
    const signatureHeader = `v1,invalidbase64sig v1,${validSig}`

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp,
      'webhook-signature': signatureHeader,
    })

    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('checkout.completed')
  })

  it('should reject an invalid webhook signature', async () => {
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      webhookSecret,
    })

    const payload = JSON.stringify({
      type: 'subscription.created',
      id: 'evt_bad',
      data: { subscription_id: 'sub_abc' },
    })

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': 'msg_bad',
      'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
      'webhook-signature': 'v1,definitelyNotAValidSignature',
    })

    expect(result.verified).toBe(false)
    expect(result.error).toBe('Invalid webhook signature')
  })

  it('should return error when required headers are missing', async () => {
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      webhookSecret,
    })

    const payload = JSON.stringify({
      type: 'subscription.created',
      id: 'evt_no_headers',
      data: {},
    })

    // Missing webhook-id and webhook-timestamp
    const result = await adapter.handleWebhook(payload, '', {})

    expect(result.verified).toBe(false)
    expect(result.error).toBe('Missing required webhook headers (webhook-id, webhook-timestamp, webhook-signature)')
  })

  it('should reject webhook when webhookSecret is not configured', async () => {
    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      // No webhookSecret — should reject
    })

    const payload = JSON.stringify({
      type: 'subscription.updated',
      id: 'evt_no_secret',
      data: { status: 'active' },
    })

    const result = await adapter.handleWebhook(payload, 'any_sig')

    expect(result.verified).toBe(false)
    expect(result.error).toBe('Polar webhookSecret is required for webhook verification')
  })

  it('should support whsec_ prefixed secrets', async () => {
    // Create a base64-encoded secret with whsec_ prefix (svix format)
    const rawSecret = 'my-super-secret-key'
    const base64Secret = btoa(rawSecret)
    const whsecSecret = `whsec_${base64Secret}`

    const adapter = createPolarAdapter({
      accessToken: 'polar_pat_abc123',
      webhookSecret: whsecSecret,
    })

    const payload = JSON.stringify({
      type: 'subscription.created',
      id: 'evt_whsec',
      data: { plan: 'pro' },
    })

    const webhookId = 'msg_whsec'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = await computePolarSig(payload, webhookId, timestamp, whsecSecret)

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    })

    expect(result.verified).toBe(true)
    expect(result.event!.id).toBe('evt_whsec')
  })
})

// ---------------------------------------------------------------------------
// Lemon Squeezy Adapter
// ---------------------------------------------------------------------------

describe('createLemonSqueezyAdapter', () => {
  const validConfig = {
    apiKey: 'ls_test_key_abc',
    storeId: 'store_123',
    webhookSecret: 'whsec_ls_test',
  }

  it('should return a named adapter with correct version', () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    expect(adapter.name).toBe('lemonsqueezy')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should report not configured when apiKey is empty', () => {
    const adapter = createLemonSqueezyAdapter({ ...validConfig, apiKey: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should report not configured when storeId is empty', () => {
    const adapter = createLemonSqueezyAdapter({ ...validConfig, storeId: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should report not configured when webhookSecret is empty', () => {
    const adapter = createLemonSqueezyAdapter({ ...validConfig, webhookSecret: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should reject webhook with invalid signature', async () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    const payload = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_1' },
      data: { attributes: { total: 999 } },
    })

    const result = await adapter.handleWebhook(payload, 'invalid_signature')

    expect(result.verified).toBe(false)
    expect(result.error).toBe('Invalid webhook signature')
  })

  it('should return unverified for malformed JSON payload', async () => {
    const adapter = createLemonSqueezyAdapter(validConfig)

    // Generate a valid HMAC signature for the malformed content
    // so we pass signature check but fail on JSON.parse
    const payload = 'not-valid-json'
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(validConfig.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const signature = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const result = await adapter.handleWebhook(payload, signature)

    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should verify and parse a valid webhook', async () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    const payload = JSON.stringify({
      meta: { event_name: 'subscription_created', webhook_id: 'wh_42' },
      data: { attributes: { status: 'active', variant_id: 100 } },
    })

    // Compute valid HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(validConfig.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const signature = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const result = await adapter.handleWebhook(payload, signature)

    expect(result.verified).toBe(true)
    expect(result.event).toBeDefined()
    expect(result.event!.type).toBe('subscription_created')
    expect(result.event!.id).toBe('wh_42')
    expect(result.event!.data).toEqual({ status: 'active', variant_id: 100 })
  })
})

// ---------------------------------------------------------------------------
// InMemoryPaymentStore
// ---------------------------------------------------------------------------

describe('InMemoryPaymentStore', () => {
  let store: InMemoryPaymentStore

  beforeEach(() => {
    store = new InMemoryPaymentStore()
  })

  it('should return null for unknown customer', async () => {
    const result = await store.getCustomer('nonexistent')
    expect(result).toBeNull()
  })

  it('should save and retrieve a customer', async () => {
    const customer = {
      id: 'cust_1',
      email: 'test@example.com',
      name: 'Test User',
      subscriptions: ['sub_1'],
      metadata: { plan: 'pro' },
    }

    await store.saveCustomer(customer)
    const result = await store.getCustomer('cust_1')

    expect(result).toEqual(customer)
  })

  it('should overwrite existing customer on save', async () => {
    const customer = { id: 'cust_1', email: 'old@example.com' }
    await store.saveCustomer(customer)

    const updated = { id: 'cust_1', email: 'new@example.com', name: 'Updated' }
    await store.saveCustomer(updated)

    const result = await store.getCustomer('cust_1')
    expect(result?.email).toBe('new@example.com')
    expect(result?.name).toBe('Updated')
  })

  it('should return null for unknown subscription', async () => {
    const result = await store.getSubscription('nonexistent')
    expect(result).toBeNull()
  })

  it('should save and retrieve a subscription', async () => {
    const subscription = {
      id: 'sub_1',
      status: 'active' as const,
      priceId: 'price_abc',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      cancelAtPeriodEnd: false,
    }

    await store.saveSubscription(subscription)
    const result = await store.getSubscription('sub_1')

    expect(result).toEqual(subscription)
  })

  it('should overwrite existing subscription on save', async () => {
    const sub = {
      id: 'sub_1',
      status: 'active' as const,
      priceId: 'price_abc',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      cancelAtPeriodEnd: false,
    }
    await store.saveSubscription(sub)

    const updated = { ...sub, status: 'canceled' as const, cancelAtPeriodEnd: true }
    await store.saveSubscription(updated)

    const result = await store.getSubscription('sub_1')
    expect(result?.status).toBe('canceled')
    expect(result?.cancelAtPeriodEnd).toBe(true)
  })

  it('should store customers and subscriptions independently', async () => {
    const customer = { id: 'cust_1', email: 'a@b.com' }
    const subscription = {
      id: 'sub_1',
      status: 'trialing' as const,
      priceId: 'price_x',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    }

    await store.saveCustomer(customer)
    await store.saveSubscription(subscription)

    // Retrieving one should not affect the other
    expect(await store.getCustomer('cust_1')).toEqual(customer)
    expect(await store.getSubscription('sub_1')).toEqual(subscription)
    expect(await store.getCustomer('sub_1')).toBeNull()
    expect(await store.getSubscription('cust_1')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Adapter interface contract across all providers
// ---------------------------------------------------------------------------

describe('PaymentAdapter interface contract', () => {
  const adapters = [
    {
      name: 'stripe',
      create: () =>
        createStripeAdapter({ secretKey: 'sk_test', webhookSecret: 'whsec_test' }),
    },
    {
      name: 'polar',
      create: () => createPolarAdapter({ accessToken: 'polar_pat' }),
    },
    {
      name: 'lemonsqueezy',
      create: () =>
        createLemonSqueezyAdapter({
          apiKey: 'ls_key',
          storeId: 'store_1',
          webhookSecret: 'whsec_ls',
        }),
    },
  ]

  for (const { name: adapterName, create } of adapters) {
    describe(`${adapterName} adapter`, () => {
      it('should have name and version properties', () => {
        const adapter = create()
        expect(typeof adapter.name).toBe('string')
        expect(adapter.name.length).toBeGreaterThan(0)
        expect(typeof adapter.version).toBe('string')
        expect(adapter.version).toMatch(/^\d+\.\d+\.\d+$/)
      })

      it('should implement isConfigured as a synchronous function', () => {
        const adapter = create()
        const result = adapter.isConfigured()
        expect(typeof result).toBe('boolean')
      })

      it('should implement all required PaymentAdapter methods', () => {
        const adapter = create()

        const requiredMethods = [
          'isConfigured',
          'createCheckout',
          'handleWebhook',
          'getCustomer',
          'getSubscription',
          'cancelSubscription',
        ]

        for (const method of requiredMethods) {
          expect(typeof (adapter as any)[method]).toBe('function')
        }
      })
    })
  }
})
