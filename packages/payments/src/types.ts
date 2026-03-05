import type {
  CustomerInfo,
  SubscriptionInfo,
  PaymentStore,
} from '@fabrk/core'

export type { PaymentStore }

export interface StripeAdapterConfig {
  secretKey: string
  webhookSecret: string
  apiVersion?: string
}

export interface PolarAdapterConfig {
  accessToken: string
  organizationId?: string
  webhookSecret?: string
}

export interface LemonSqueezyAdapterConfig {
  apiKey: string
  storeId: string
  webhookSecret: string
}

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
