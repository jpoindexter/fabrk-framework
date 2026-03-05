import type { PaymentAdapter } from '@fabrk/core'
import type {
  CheckoutOptions,
  CheckoutResult,
  WebhookResult,
  CustomerInfo,
  SubscriptionInfo,
} from '@fabrk/core'
import type { LemonSqueezyAdapterConfig } from '../types'
import { timingSafeEqual, hashPayload, bytesToHex } from '@fabrk/core'
import { createIdempotencyCache, DEFAULT_CACHE_SIZE, decodePayload } from '../idempotency'

const lsCache = createIdempotencyCache(DEFAULT_CACHE_SIZE)

export function createLemonSqueezyAdapter(config: LemonSqueezyAdapterConfig): PaymentAdapter {
  const baseUrl = 'https://api.lemonsqueezy.com/v1'

  async function lsFetch(path: string, options?: globalThis.RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Lemon Squeezy API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async function verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(config.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSignature = bytesToHex(new Uint8Array(signed))

    return timingSafeEqual(expectedSignature, signature)
  }

  return {
    name: 'lemonsqueezy',
    version: '1.0.0',

    isConfigured(): boolean {
      return Boolean(config.apiKey && config.storeId && config.webhookSecret)
    },

    async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
      const data = await lsFetch('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: options.customerEmail,
                custom: options.metadata ?? {},
              },
              product_options: {
                redirect_url: options.successUrl,
              },
            },
            relationships: {
              store: {
                data: { type: 'stores', id: config.storeId },
              },
              variant: {
                data: { type: 'variants', id: options.priceId },
              },
            },
          },
        }),
      })

      return {
        id: data.data.id,
        url: data.data.attributes.url,
        raw: data,
      }
    },

    async handleWebhook(payload: string | ArrayBuffer, signature: string): Promise<WebhookResult> {
      try {
        const payloadStr = decodePayload(payload)
        const verified = await verifyWebhookSignature(payloadStr, signature)

        if (!verified) {
          return { verified: false, error: 'Invalid webhook signature' }
        }

        const event = JSON.parse(payloadStr)

        // Replay protection: two-sided timestamp check.
        // Math.abs() would accept future-dated events (attacker sets timestamp far in
        // the future so the event remains "valid" forever). Use explicit bounds instead.
        const createdAt = event.meta?.created_at
        if (!createdAt) {
          return { verified: false, error: 'Webhook missing timestamp (replay protection)' }
        }
        const eventTimestamp = new Date(createdAt).getTime()
        if (isNaN(eventTimestamp)) {
          return { verified: false, error: 'Webhook timestamp is not a valid date (replay protection)' }
        }
        const now = Date.now()
        if (eventTimestamp < now - 300_000) {
          return { verified: false, error: 'Webhook timestamp too old (possible replay)' }
        }
        if (eventTimestamp > now + 30_000) {
          return { verified: false, error: 'Webhook timestamp in the future (possible replay)' }
        }

        // Derive a deterministic ID from payload hash when event has no webhook_id
        const eventId = event.meta?.webhook_id ?? `derived:${await hashPayload(payloadStr)}`
        const eventType = event.meta?.event_name ?? 'unknown'
        const eventData = (event.data?.attributes ?? event.data ?? {}) as Record<string, unknown>
        if (!lsCache.markProcessed(eventId)) {
          return {
            verified: true,
            duplicate: true,
            event: { type: eventType, id: eventId, data: eventData, raw: event },
          }
        }

        return {
          verified: true,
          event: {
            type: eventType,
            id: eventId,
            data: eventData,
            raw: event,
          },
        }
      } catch (err) {
        return {
          verified: false,
          error: err instanceof Error ? err.message : 'Webhook verification failed',
        }
      }
    },

    async getCustomer(customerId: string): Promise<CustomerInfo | null> {
      try {
        const data = await lsFetch(`/customers/${encodeURIComponent(customerId)}`)
        const attrs = data.data.attributes

        return {
          id: data.data.id,
          email: attrs.email,
          name: attrs.name ?? undefined,
          subscriptions: [],
          metadata: {},
        }
      } catch {
        return null
      }
    },

    async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
      try {
        const data = await lsFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`)
        const attrs = data.data.attributes

        const statusMap: Record<string, SubscriptionInfo['status']> = {
          active: 'active',
          on_trial: 'trialing',
          past_due: 'past_due',
          cancelled: 'canceled',
          unpaid: 'unpaid',
          paused: 'paused',
        }

        return {
          id: data.data.id,
          status: statusMap[attrs.status] ?? 'active',
          priceId: attrs.variant_id?.toString() ?? '',
          currentPeriodStart: new Date(attrs.created_at),
          currentPeriodEnd: new Date(attrs.renews_at),
          cancelAtPeriodEnd: attrs.cancelled ?? false,
        }
      } catch {
        return null
      }
    },

    async cancelSubscription(
      subscriptionId: string,
      options?: { atPeriodEnd?: boolean }
    ): Promise<void> {
      if (options?.atPeriodEnd) {
        // Schedule cancellation at end of current billing period via PATCH
        await lsFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              type: 'subscriptions',
              id: subscriptionId,
              attributes: {
                cancelled: true,
              },
            },
          }),
        })
      } else {
        // Immediate cancellation via DELETE
        await lsFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
          method: 'DELETE',
        })
      }
    },
  }
}
