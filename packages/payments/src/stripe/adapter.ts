import type { PaymentAdapter } from '@fabrk/core'
import type {
  CheckoutOptions,
  CheckoutResult,
  WebhookResult,
  CustomerInfo,
  SubscriptionInfo,
} from '@fabrk/core'
import type { StripeAdapterConfig } from '../types'
import { createIdempotencyCache, DEFAULT_CACHE_SIZE, decodePayload } from '../idempotency'

const stripeCache = createIdempotencyCache(DEFAULT_CACHE_SIZE)

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
      stripe = new StripeClass(config.secretKey, { apiVersion: config.apiVersion ?? '2024-12-18.acacia' })
    }
    return stripe
  }

  return {
    name: 'stripe',
    version: '1.0.0',

    async initialize() {
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
        const payloadStr = decodePayload(payload)
        const event = s.webhooks.constructEvent(payloadStr, signature, config.webhookSecret)

        // Note: replay protection is handled by constructEvent() above, which
        // validates the `t=` timestamp in the Stripe-Signature header (300s window
        // by default). event.created is the original event creation time, NOT the
        // delivery timestamp — checking it here would reject legitimate delayed
        // retries. The idempotency cache below handles duplicate delivery.

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
