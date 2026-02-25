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
import { timingSafeEqual, hashPayload } from '../crypto-utils'
import { createIdempotencyCache } from '../idempotency'

// Shared idempotency cache to reject duplicate webhook events
const polarCache = createIdempotencyCache(10_000)

/**
 * @remarks **Serverless warning:** The built-in idempotency cache is process-scoped
 * and does NOT survive cold starts on serverless platforms (Vercel, AWS Lambda, etc.).
 * For production serverless deployments, inject a persistent idempotency store
 * (Redis, database) to prevent webhook replay attacks across function invocations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

  /**
   * Verify a Polar webhook signature (svix format).
   *
   * Polar uses svix under the hood. The signature is computed as:
   *   message = `${webhookId}.${timestamp}.${body}`
   *   signature = base64(HMAC-SHA256(webhookSecret, message))
   *
   * The `webhook-signature` header may contain multiple signatures
   * separated by spaces, each prefixed with `v1,`.
   */
  async function verifyWebhookSignature(
    body: string,
    webhookId: string,
    timestamp: string,
    signatureHeader: string
  ): Promise<boolean> {
    const secret = config.webhookSecret!
    // svix secrets may be prefixed with "whsec_"; the actual key is base64-encoded after the prefix
    const secretBytes = secret.startsWith('whsec_')
      ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(secret)

    const encoder = new TextEncoder()
    const message = `${webhookId}.${timestamp}.${body}`

    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signed)))

    // The header contains space-separated signatures, each prefixed with "v1,"
    const signatures = signatureHeader.split(' ')
    for (const sig of signatures) {
      const parts = sig.split(',')
      if (parts.length < 2) continue
      // parts[0] is the version (e.g., "v1"), parts[1] is the base64 signature
      const sigValue = parts.slice(1).join(',')
      if (timingSafeEqual(sigValue, expectedSignature)) {
        return true
      }
    }

    return false
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

    async handleWebhook(payload: string | ArrayBuffer, signature: string, headers?: Record<string, string>): Promise<WebhookResult> {
      try {
        const payloadStr = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)

        // Verify signature if webhookSecret is configured
        if (config.webhookSecret) {
          const webhookId = headers?.['webhook-id'] ?? ''
          const timestamp = headers?.['webhook-timestamp'] ?? ''
          const signatureHeader = headers?.['webhook-signature'] ?? signature

          if (!webhookId || !timestamp || !signatureHeader) {
            return {
              verified: false,
              error: 'Missing required webhook headers (webhook-id, webhook-timestamp, webhook-signature)',
            }
          }

          // Allow up to 30s clock skew forward; reject anything older than 5min
          const timestampAge = Date.now() / 1000 - Number(timestamp)
          if (isNaN(timestampAge) || timestampAge < -30 || timestampAge > 300) {
            return { verified: false, error: 'Webhook timestamp out of range (replay protection)' }
          }

          const verified = await verifyWebhookSignature(payloadStr, webhookId, timestamp, signatureHeader)
          if (!verified) {
            return { verified: false, error: 'Invalid webhook signature' }
          }
        } else {
          return {
            verified: false,
            error: 'Polar webhookSecret is required for webhook verification',
          }
        }

        const event = JSON.parse(payloadStr)

        // Idempotency: reject duplicate event IDs
        // Derive a deterministic ID from payload hash when event has no ID
        const eventId = event.id ?? `derived:${await hashPayload(payloadStr)}`
        if (!polarCache.markProcessed(eventId)) {
          return {
            verified: true,
            duplicate: true,
            event: {
              type: event.type,
              id: eventId,
              data: event.data as Record<string, unknown>,
              raw: event,
            },
          }
        }

        return {
          verified: true,
          event: {
            type: event.type,
            id: eventId,
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
        const data = await polarFetch(`/customers/${encodeURIComponent(customerId)}`)

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
        const data = await polarFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`)

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
      await polarFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          cancel_at_period_end: options?.atPeriodEnd ?? true,
        }),
      })
    },
  }
}
