 
import { describe, it, expect, beforeEach } from 'vitest'
import { createStripeAdapter } from './stripe/adapter'
import { createPolarAdapter } from './polar/adapter'
import { createLemonSqueezyAdapter } from './lemonsqueezy/adapter'
import { InMemoryPaymentStore } from './types'
import { bytesToHex } from '@fabrk/core'

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

describe('createStripeAdapter', () => {
  it('should return a named adapter and check isConfigured', () => {
    const adapter = createStripeAdapter({ secretKey: 'sk_test_abc123', webhookSecret: 'whsec_test_xyz' })
    expect(adapter.name).toBe('stripe')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)

    expect(createStripeAdapter({ secretKey: '', webhookSecret: 'whsec_test' }).isConfigured()).toBe(false)
    expect(createStripeAdapter({ secretKey: 'sk_test_abc', webhookSecret: '' }).isConfigured()).toBe(false)
  })
})

describe('createPolarAdapter', () => {
  const validConfig = { accessToken: 'polar_pat_abc123', webhookSecret: 'test_basic_webhook_secret' }

  it('should return a named adapter and check isConfigured', () => {
    const adapter = createPolarAdapter(validConfig)
    expect(adapter.name).toBe('polar')
    expect(adapter.isConfigured()).toBe(true)
    expect(createPolarAdapter({ accessToken: '' }).isConfigured()).toBe(false)
  })

  it('should handle valid JSON and ArrayBuffer webhook payloads', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_123', data: { subscription_id: 'sub_abc' } })
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)
    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('subscription.created')
    expect(result.event!.id).toBe('evt_123')

    // ArrayBuffer variant
    const buffer = new TextEncoder().encode(payload).buffer
    const result2 = await adapter.handleWebhook(buffer, '', headers)
    expect(result2.verified).toBe(true)
  })

  it('should return unverified for invalid JSON payload', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = 'not valid json'
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)
    expect(result.verified).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should generate an id when webhook event has no id', async () => {
    const adapter = createPolarAdapter(validConfig)
    const payload = JSON.stringify({ type: 'subscription.updated', data: { status: 'active' } })
    const headers = await polarWebhookHeaders(payload, validConfig.webhookSecret)

    const result = await adapter.handleWebhook(payload, '', headers)
    expect(result.verified).toBe(true)
    expect(result.event!.id.length).toBeGreaterThan(0)
  })
})

describe('Polar webhook signature verification', () => {
  const webhookSecret = 'test_polar_webhook_secret'
  const config = { accessToken: 'polar_pat_abc123', webhookSecret }

  it('should verify valid signature and reject invalid signature', async () => {
    const adapter = createPolarAdapter(config)
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_sig_1', data: { subscription_id: 'sub_xyz' } })

    const webhookId = 'msg_abc123'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = await computePolarSig(payload, webhookId, timestamp, webhookSecret)

    const valid = await adapter.handleWebhook(payload, '', {
      'webhook-id': webhookId, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${sig}`,
    })
    expect(valid.verified).toBe(true)

    const invalid = await adapter.handleWebhook(payload, '', {
      'webhook-id': 'msg_bad', 'webhook-timestamp': timestamp, 'webhook-signature': 'v1,definitelyNotAValidSignature',
    })
    expect(invalid.verified).toBe(false)
    expect(invalid.error).toBe('Invalid webhook signature')
  })

  it('should return error when required headers are missing', async () => {
    const adapter = createPolarAdapter(config)
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_no_headers', data: {} })

    const result = await adapter.handleWebhook(payload, '', {})
    expect(result.verified).toBe(false)
    expect(result.error).toContain('Missing required webhook headers')
  })

  it('should reject when webhookSecret is not configured', async () => {
    const adapter = createPolarAdapter({ accessToken: 'polar_pat_abc123' })
    const result = await adapter.handleWebhook('{}', 'any_sig')
    expect(result.verified).toBe(false)
    expect(result.error).toContain('webhookSecret is required')
  })

  it('should support whsec_ prefixed secrets', async () => {
    const base64Secret = btoa('my-super-secret-key')
    const whsecSecret = `whsec_${base64Secret}`

    const adapter = createPolarAdapter({ accessToken: 'polar_pat_abc123', webhookSecret: whsecSecret })
    const payload = JSON.stringify({ type: 'subscription.created', id: 'evt_whsec', data: { plan: 'pro' } })

    const webhookId = 'msg_whsec'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = await computePolarSig(payload, webhookId, timestamp, whsecSecret)

    const result = await adapter.handleWebhook(payload, '', {
      'webhook-id': webhookId, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${sig}`,
    })
    expect(result.verified).toBe(true)
  })
})

describe('createLemonSqueezyAdapter', () => {
  const validConfig = { apiKey: 'ls_test_key_abc', storeId: 'store_123', webhookSecret: 'whsec_ls_test' }

  it('should return a named adapter and check isConfigured', () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    expect(adapter.name).toBe('lemonsqueezy')
    expect(adapter.isConfigured()).toBe(true)

    expect(createLemonSqueezyAdapter({ ...validConfig, apiKey: '' }).isConfigured()).toBe(false)
    expect(createLemonSqueezyAdapter({ ...validConfig, storeId: '' }).isConfigured()).toBe(false)
    expect(createLemonSqueezyAdapter({ ...validConfig, webhookSecret: '' }).isConfigured()).toBe(false)
  })

  it('should reject webhook with invalid signature', async () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    const payload = JSON.stringify({ meta: { event_name: 'order_created', webhook_id: 'wh_1' }, data: { attributes: { total: 999 } } })

    const result = await adapter.handleWebhook(payload, 'invalid_signature')
    expect(result.verified).toBe(false)
    expect(result.error).toBe('Invalid webhook signature')
  })

  it('should verify and parse a valid webhook', async () => {
    const adapter = createLemonSqueezyAdapter(validConfig)
    const payload = JSON.stringify({
      meta: { event_name: 'subscription_created', webhook_id: 'wh_42', created_at: new Date().toISOString() },
      data: { attributes: { status: 'active', variant_id: 100 } },
    })

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(validConfig.webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const signature = bytesToHex(new Uint8Array(signed))

    const result = await adapter.handleWebhook(payload, signature)
    expect(result.verified).toBe(true)
    expect(result.event!.type).toBe('subscription_created')
    expect(result.event!.id).toBe('wh_42')
    expect(result.event!.data).toEqual({ status: 'active', variant_id: 100 })
  })
})

describe('InMemoryPaymentStore', () => {
  let store: InMemoryPaymentStore

  beforeEach(() => { store = new InMemoryPaymentStore() })

  it('should save, retrieve, and overwrite customers', async () => {
    expect(await store.getCustomer('nonexistent')).toBeNull()

    await store.saveCustomer({ id: 'cust_1', email: 'test@example.com', name: 'Test User', subscriptions: ['sub_1'] })
    expect((await store.getCustomer('cust_1'))!.email).toBe('test@example.com')

    await store.saveCustomer({ id: 'cust_1', email: 'new@example.com', name: 'Updated' })
    expect((await store.getCustomer('cust_1'))!.email).toBe('new@example.com')
  })

  it('should save, retrieve, and overwrite subscriptions', async () => {
    expect(await store.getSubscription('nonexistent')).toBeNull()

    const sub = {
      id: 'sub_1', status: 'active' as const, priceId: 'price_abc',
      currentPeriodStart: new Date('2025-01-01'), currentPeriodEnd: new Date('2025-02-01'), cancelAtPeriodEnd: false,
    }
    await store.saveSubscription(sub)
    expect((await store.getSubscription('sub_1'))!.status).toBe('active')

    await store.saveSubscription({ ...sub, status: 'canceled' as const })
    expect((await store.getSubscription('sub_1'))!.status).toBe('canceled')
  })
})
