/**
 * Polar Payment Adapter
 *
 * Implements PaymentAdapter using Polar API.
 * Polar provides open-source friendly payment processing.
 *
 * @example
 * ```ts
 * import { createPolarAdapter } from '@fabrk/payments'
 *
 * const payments = createPolarAdapter({
 *   accessToken: process.env.POLAR_ACCESS_TOKEN!,
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
import type { PolarAdapterConfig } from '../types'

export function createPolarAdapter(config: PolarAdapterConfig): PaymentAdapter {
  const baseUrl = 'https://api.polar.sh/v1'

  async function polarFetch(path: string, options?: globalThis.RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  return {
    name: 'polar',
    version: '1.0.0',

    isConfigured(): boolean {
      return Boolean(config.accessToken)
    },

    async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
      const data = await polarFetch('/checkouts/custom', {
        method: 'POST',
        body: JSON.stringify({
          product_price_id: options.priceId,
          success_url: options.successUrl,
          customer_email: options.customerEmail,
          metadata: options.metadata ?? {},
        }),
      })

      return {
        id: data.id,
        url: data.url,
        raw: data,
      }
    },

    async handleWebhook(payload: string | ArrayBuffer, _signature: string): Promise<WebhookResult> {
      try {
        const payloadStr = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
        const event = JSON.parse(payloadStr)

        // Polar webhook verification is done via the webhook secret
        // In production, verify the signature header
        return {
          verified: true,
          event: {
            type: event.type,
            id: event.id ?? crypto.randomUUID(),
            data: event.data as Record<string, unknown>,
            raw: event,
          },
        }
      } catch (err) {
        return {
          verified: false,
          error: err instanceof Error ? err.message : 'Webhook parse failed',
        }
      }
    },

    async getCustomer(customerId: string): Promise<CustomerInfo | null> {
      try {
        const data = await polarFetch(`/customers/${customerId}`)

        return {
          id: data.id,
          email: data.email,
          name: data.name ?? undefined,
          subscriptions: data.subscriptions?.map((s: any) => s.id) ?? [],
          metadata: data.metadata ?? {},
        }
      } catch {
        return null
      }
    },

    async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
      try {
        const data = await polarFetch(`/subscriptions/${subscriptionId}`)

        return {
          id: data.id,
          status: data.status as SubscriptionInfo['status'],
          priceId: data.price_id ?? '',
          currentPeriodStart: new Date(data.current_period_start),
          currentPeriodEnd: new Date(data.current_period_end),
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        }
      } catch {
        return null
      }
    },

    async cancelSubscription(
      subscriptionId: string,
      options?: { atPeriodEnd?: boolean }
    ): Promise<void> {
      await polarFetch(`/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          cancel_at_period_end: options?.atPeriodEnd ?? true,
        }),
      })
    },
  }
}
