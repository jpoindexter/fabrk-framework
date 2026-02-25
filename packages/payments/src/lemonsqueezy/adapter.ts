/**
 * Lemon Squeezy Payment Adapter
 *
 * Implements PaymentAdapter using Lemon Squeezy API.
 *
 * @example
 * ```ts
 * import { createLemonSqueezyAdapter } from '@fabrk/payments'
 *
 * const payments = createLemonSqueezyAdapter({
 *   apiKey: process.env.LEMONSQUEEZY_API_KEY!,
 *   storeId: process.env.LEMONSQUEEZY_STORE_ID!,
 *   webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
 * })
 * ```
 */

import type { PaymentAdapter } from '@fabrk/core'
import type {
  CheckoutOptions,
  CheckoutResult,
  WebhookResult,
  CustomerInfo,
  SubscriptionInfo,
} from '@fabrk/core'
import type { LemonSqueezyAdapterConfig } from '../types'
import { timingSafeEqual } from '../crypto-utils'

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
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Constant-time comparison to prevent timing attacks
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
        const payloadStr = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
        const verified = await verifyWebhookSignature(payloadStr, signature)

        if (!verified) {
          return { verified: false, error: 'Invalid webhook signature' }
        }

        const event = JSON.parse(payloadStr)

        return {
          verified: true,
          event: {
            type: event.meta.event_name,
            id: event.meta.webhook_id ?? crypto.randomUUID(),
            data: event.data.attributes as Record<string, unknown>,
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
        const data = await lsFetch(`/customers/${customerId}`)
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
        const data = await lsFetch(`/subscriptions/${subscriptionId}`)
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
          currentPeriodStart: new Date(attrs.renews_at),
          currentPeriodEnd: new Date(attrs.renews_at),
          cancelAtPeriodEnd: attrs.cancelled ?? false,
        }
      } catch {
        return null
      }
    },

    async cancelSubscription(
      subscriptionId: string,
      _options?: { atPeriodEnd?: boolean }
    ): Promise<void> {
      await lsFetch(`/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      })
    },
  }
}
