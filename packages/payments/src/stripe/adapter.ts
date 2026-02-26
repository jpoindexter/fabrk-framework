/**
 * Stripe Payment Adapter
 *
 * Implements PaymentAdapter using Stripe SDK.
 * Stripe is provided as an optional peer dependency.
 *
 * @example
 * ```ts
 * import { createStripeAdapter } from '@fabrk/payments'
 *
 * const payments = createStripeAdapter({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * })
 *
 * // Register with FABRK
 * registry.register('payment', payments)
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
import type { StripeAdapterConfig } from '../types'
import { createIdempotencyCache } from '../idempotency'

// Shared idempotency cache to reject duplicate webhook events
const stripeCache = createIdempotencyCache(10_000)

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function createStripeAdapter(config: StripeAdapterConfig): PaymentAdapter {
  let stripe: any = null

  async function getStripe() {
    if (!stripe) {
      let StripeClass: any
      try {
        const mod = await import('stripe')
        StripeClass = mod.default || mod
      } catch {
        throw new Error('@fabrk/payments: stripe package is required. Run: npm install stripe')
      }
      // Let constructor errors propagate naturally (invalid key format, etc.)
      stripe = new StripeClass(config.secretKey, { apiVersion: config.apiVersion ?? '2024-12-18.acacia' })
    }
    return stripe
  }

  return {
    name: 'stripe',
    version: '1.0.0',

    async initialize() {
      // Validate Stripe is available
      await getStripe()
    },

    isConfigured(): boolean {
      return Boolean(config.secretKey && config.webhookSecret)
    },

    async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
      const s = await getStripe()

      const params: any = {
        mode: options.subscription ? 'subscription' : 'payment',
        line_items: [{ price: options.priceId, quantity: 1 }],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: options.metadata ?? {},
      }

      if (options.customerEmail) {
        params.customer_email = options.customerEmail
      }

      if (options.customerId) {
        params.customer = options.customerId
      }

      if (options.subscription && options.trialDays) {
        params.subscription_data = {
          trial_period_days: options.trialDays,
        }
      }

      const session = await s.checkout.sessions.create(params)

      return {
        id: session.id,
        url: session.url!,
        raw: session,
      }
    },

    async handleWebhook(payload: string | ArrayBuffer, signature: string): Promise<WebhookResult> {
      const s = await getStripe()

      try {
        const payloadStr = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
        const event = s.webhooks.constructEvent(payloadStr, signature, config.webhookSecret)

        // Replay protection: two-sided timestamp check.
        // Math.abs() would accept future-dated events (attacker sets timestamp far in
        // the future so the event remains "valid" forever). Use explicit bounds instead.
        const now = Math.floor(Date.now() / 1000)
        if (event.created < now - 300) {
          return { verified: false, error: 'Webhook timestamp too old (possible replay)' }
        }
        if (event.created > now + 30) {
          return { verified: false, error: 'Webhook timestamp in the future (possible replay)' }
        }

        // Idempotency: reject duplicate event IDs
        if (!stripeCache.markProcessed(event.id)) {
          return {
            verified: true,
            duplicate: true,
            event: {
              type: event.type,
              id: event.id,
              data: event.data.object as Record<string, unknown>,
              raw: event,
            },
          }
        }

        return {
          verified: true,
          event: {
            type: event.type,
            id: event.id,
            data: event.data.object as Record<string, unknown>,
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
      const s = await getStripe()

      try {
        const customer = await s.customers.retrieve(customerId, {
          expand: ['subscriptions'],
        })

        if (customer.deleted) return null

        return {
          id: customer.id,
          email: customer.email ?? '',
          name: customer.name ?? undefined,
          subscriptions: customer.subscriptions?.data?.map((sub: any) => sub.id) ?? [],
          metadata: customer.metadata ?? {},
        }
      } catch {
        return null
      }
    },

    async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
      const s = await getStripe()

      try {
        const sub = await s.subscriptions.retrieve(subscriptionId)

        return {
          id: sub.id,
          status: sub.status as SubscriptionInfo['status'],
          priceId: sub.items.data[0]?.price?.id ?? '',
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        }
      } catch {
        return null
      }
    },

    async cancelSubscription(
      subscriptionId: string,
      options?: { atPeriodEnd?: boolean }
    ): Promise<void> {
      const s = await getStripe()

      if (options?.atPeriodEnd) {
        await s.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })
      } else {
        await s.subscriptions.cancel(subscriptionId)
      }
    },

    async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
      const s = await getStripe()

      const session = await s.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })

      return session.url
    },
  }
}
