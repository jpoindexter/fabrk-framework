/**
 * Payment package types
 */

import type {
  CustomerInfo,
  SubscriptionInfo,
  PaymentStore,
} from '@fabrk/core'

// Re-export store interface for convenience
export type { PaymentStore }

export interface StripeAdapterConfig {
  /** Stripe secret key */
  secretKey: string
  /** Stripe webhook signing secret */
  webhookSecret: string
  /** API version override */
  apiVersion?: string
}

export interface PolarAdapterConfig {
  /** Polar API access token */
  accessToken: string
  /** Polar organization ID */
  organizationId?: string
  /** Webhook secret */
  webhookSecret?: string
}

export interface LemonSqueezyAdapterConfig {
  /** Lemon Squeezy API key */
  apiKey: string
  /** Store ID */
  storeId: string
  /** Webhook signing secret */
  webhookSecret: string
}

/**
 * In-memory payment store for development/testing
 */
export class InMemoryPaymentStore implements PaymentStore {
  private customers = new Map<string, CustomerInfo>()
  private subscriptions = new Map<string, SubscriptionInfo>()

  async getCustomer(userId: string): Promise<CustomerInfo | null> {
    return this.customers.get(userId) ?? null
  }

  async saveCustomer(customer: CustomerInfo): Promise<void> {
    this.customers.set(customer.id, customer)
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    return this.subscriptions.get(subscriptionId) ?? null
  }

  async saveSubscription(subscription: SubscriptionInfo): Promise<void> {
    this.subscriptions.set(subscription.id, subscription)
  }
}
