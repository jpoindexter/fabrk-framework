import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPaymentStore } from '../types'
import type { CustomerInfo, SubscriptionInfo } from '@fabrk/core'

// ============================================================================
// InMemoryPaymentStore — Full Lifecycle Integration Tests
// ============================================================================

describe('InMemoryPaymentStore Full Lifecycle', () => {
  let store: InMemoryPaymentStore

  beforeEach(() => {
    store = new InMemoryPaymentStore()
  })

  // ============================================================================
  // Customer Operations
  // ============================================================================

  describe('Customer Operations', () => {
    it('should save and retrieve a customer', async () => {
      const customer: CustomerInfo = {
        id: 'cus_001',
        email: 'alice@example.com',
        name: 'Alice Johnson',
        subscriptions: [],
        metadata: { plan: 'pro' },
      }

      await store.saveCustomer(customer)
      const retrieved = await store.getCustomer('cus_001')

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe('cus_001')
      expect(retrieved!.email).toBe('alice@example.com')
      expect(retrieved!.name).toBe('Alice Johnson')
      expect(retrieved!.metadata).toEqual({ plan: 'pro' })
    })

    it('should return null for non-existent customer', async () => {
      const result = await store.getCustomer('cus_nonexistent')
      expect(result).toBeNull()
    })

    it('should update a customer by saving with the same ID', async () => {
      const customer: CustomerInfo = {
        id: 'cus_002',
        email: 'bob@example.com',
        name: 'Bob Smith',
      }

      await store.saveCustomer(customer)

      // Update customer
      const updated: CustomerInfo = {
        id: 'cus_002',
        email: 'bob@newdomain.com',
        name: 'Robert Smith',
        metadata: { upgraded: 'true' },
      }

      await store.saveCustomer(updated)

      const retrieved = await store.getCustomer('cus_002')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.email).toBe('bob@newdomain.com')
      expect(retrieved!.name).toBe('Robert Smith')
      expect(retrieved!.metadata).toEqual({ upgraded: 'true' })
    })

    it('should store multiple customers independently', async () => {
      const customer1: CustomerInfo = {
        id: 'cus_100',
        email: 'user1@example.com',
        name: 'User One',
      }

      const customer2: CustomerInfo = {
        id: 'cus_200',
        email: 'user2@example.com',
        name: 'User Two',
      }

      await store.saveCustomer(customer1)
      await store.saveCustomer(customer2)

      const r1 = await store.getCustomer('cus_100')
      const r2 = await store.getCustomer('cus_200')

      expect(r1!.name).toBe('User One')
      expect(r2!.name).toBe('User Two')
    })
  })

  // ============================================================================
  // Subscription Operations
  // ============================================================================

  describe('Subscription Operations', () => {
    it('should save and retrieve a subscription', async () => {
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const subscription: SubscriptionInfo = {
        id: 'sub_001',
        status: 'active',
        priceId: 'price_pro_monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      }

      await store.saveSubscription(subscription)
      const retrieved = await store.getSubscription('sub_001')

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe('sub_001')
      expect(retrieved!.status).toBe('active')
      expect(retrieved!.priceId).toBe('price_pro_monthly')
      expect(retrieved!.cancelAtPeriodEnd).toBe(false)
      expect(retrieved!.currentPeriodStart).toEqual(now)
      expect(retrieved!.currentPeriodEnd).toEqual(periodEnd)
    })

    it('should return null for non-existent subscription', async () => {
      const result = await store.getSubscription('sub_nonexistent')
      expect(result).toBeNull()
    })

    it('should update a subscription status', async () => {
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const subscription: SubscriptionInfo = {
        id: 'sub_002',
        status: 'active',
        priceId: 'price_starter_monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      }

      await store.saveSubscription(subscription)

      // Update subscription to canceled
      const updated: SubscriptionInfo = {
        ...subscription,
        status: 'canceled',
        cancelAtPeriodEnd: true,
      }

      await store.saveSubscription(updated)

      const retrieved = await store.getSubscription('sub_002')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.status).toBe('canceled')
      expect(retrieved!.cancelAtPeriodEnd).toBe(true)
      // Price should remain unchanged
      expect(retrieved!.priceId).toBe('price_starter_monthly')
    })

    it('should store multiple subscriptions independently', async () => {
      const now = new Date()

      const sub1: SubscriptionInfo = {
        id: 'sub_100',
        status: 'active',
        priceId: 'price_pro',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
        cancelAtPeriodEnd: false,
      }

      const sub2: SubscriptionInfo = {
        id: 'sub_200',
        status: 'trialing',
        priceId: 'price_enterprise',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 14 * 86400000),
        cancelAtPeriodEnd: false,
      }

      await store.saveSubscription(sub1)
      await store.saveSubscription(sub2)

      const r1 = await store.getSubscription('sub_100')
      const r2 = await store.getSubscription('sub_200')

      expect(r1!.status).toBe('active')
      expect(r1!.priceId).toBe('price_pro')
      expect(r2!.status).toBe('trialing')
      expect(r2!.priceId).toBe('price_enterprise')
    })
  })

  // ============================================================================
  // Full Customer + Subscription Lifecycle
  // ============================================================================

  describe('Full Customer + Subscription Lifecycle', () => {
    it('should handle complete payment lifecycle: create customer, add subscription, update, retrieve', async () => {
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Step 1: Create customer
      const customer: CustomerInfo = {
        id: 'cus_lifecycle',
        email: 'lifecycle@example.com',
        name: 'Lifecycle User',
        subscriptions: [],
      }
      await store.saveCustomer(customer)

      // Step 2: Create subscription for customer
      const subscription: SubscriptionInfo = {
        id: 'sub_lifecycle',
        status: 'trialing',
        priceId: 'price_pro_monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      }
      await store.saveSubscription(subscription)

      // Step 3: Update customer with subscription reference
      const updatedCustomer: CustomerInfo = {
        ...customer,
        subscriptions: ['sub_lifecycle'],
        metadata: { tier: 'pro' },
      }
      await store.saveCustomer(updatedCustomer)

      // Step 4: Retrieve and verify customer
      const retrievedCustomer = await store.getCustomer('cus_lifecycle')
      expect(retrievedCustomer).not.toBeNull()
      expect(retrievedCustomer!.name).toBe('Lifecycle User')
      expect(retrievedCustomer!.subscriptions).toEqual(['sub_lifecycle'])
      expect(retrievedCustomer!.metadata).toEqual({ tier: 'pro' })

      // Step 5: Retrieve and verify subscription
      const retrievedSub = await store.getSubscription('sub_lifecycle')
      expect(retrievedSub).not.toBeNull()
      expect(retrievedSub!.status).toBe('trialing')

      // Step 6: Subscription activates after trial
      const activatedSub: SubscriptionInfo = {
        ...subscription,
        status: 'active',
      }
      await store.saveSubscription(activatedSub)

      const activeRetrieved = await store.getSubscription('sub_lifecycle')
      expect(activeRetrieved!.status).toBe('active')

      // Step 7: User cancels at period end
      const canceledSub: SubscriptionInfo = {
        ...activatedSub,
        cancelAtPeriodEnd: true,
      }
      await store.saveSubscription(canceledSub)

      const canceledRetrieved = await store.getSubscription('sub_lifecycle')
      expect(canceledRetrieved!.status).toBe('active')
      expect(canceledRetrieved!.cancelAtPeriodEnd).toBe(true)

      // Step 8: Subscription finally cancels
      const finallyCanceled: SubscriptionInfo = {
        ...canceledSub,
        status: 'canceled',
      }
      await store.saveSubscription(finallyCanceled)

      const finalRetrieved = await store.getSubscription('sub_lifecycle')
      expect(finalRetrieved!.status).toBe('canceled')
      expect(finalRetrieved!.cancelAtPeriodEnd).toBe(true)
    })

    it('should handle subscription status transitions', async () => {
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 86400000)

      const baseSub: SubscriptionInfo = {
        id: 'sub_transitions',
        status: 'trialing',
        priceId: 'price_test',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      }

      // trialing -> active -> past_due -> active -> canceled
      const transitions: Array<SubscriptionInfo['status']> = [
        'trialing',
        'active',
        'past_due',
        'active',
        'canceled',
      ]

      for (const status of transitions) {
        await store.saveSubscription({ ...baseSub, status })
        const retrieved = await store.getSubscription('sub_transitions')
        expect(retrieved!.status).toBe(status)
      }
    })

    it('should handle customer with multiple subscriptions', async () => {
      const now = new Date()

      const customer: CustomerInfo = {
        id: 'cus_multi',
        email: 'multi@example.com',
        name: 'Multi Sub User',
        subscriptions: ['sub_a', 'sub_b', 'sub_c'],
      }

      await store.saveCustomer(customer)

      // Create subscriptions
      for (const subId of ['sub_a', 'sub_b', 'sub_c']) {
        await store.saveSubscription({
          id: subId,
          status: 'active',
          priceId: `price_${subId}`,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
          cancelAtPeriodEnd: false,
        })
      }

      // Retrieve customer
      const retrieved = await store.getCustomer('cus_multi')
      expect(retrieved!.subscriptions).toHaveLength(3)

      // Retrieve each subscription
      for (const subId of ['sub_a', 'sub_b', 'sub_c']) {
        const sub = await store.getSubscription(subId)
        expect(sub).not.toBeNull()
        expect(sub!.status).toBe('active')
      }

      // Cancel one
      await store.saveSubscription({
        id: 'sub_b',
        status: 'canceled',
        priceId: 'price_sub_b',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
        cancelAtPeriodEnd: true,
      })

      const subB = await store.getSubscription('sub_b')
      expect(subB!.status).toBe('canceled')

      // Others still active
      const subA = await store.getSubscription('sub_a')
      expect(subA!.status).toBe('active')
    })

    it('should preserve date objects through save/retrieve', async () => {
      const start = new Date('2025-01-01T00:00:00Z')
      const end = new Date('2025-01-31T23:59:59Z')

      const subscription: SubscriptionInfo = {
        id: 'sub_dates',
        status: 'active',
        priceId: 'price_test',
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      }

      await store.saveSubscription(subscription)
      const retrieved = await store.getSubscription('sub_dates')

      expect(retrieved!.currentPeriodStart).toEqual(start)
      expect(retrieved!.currentPeriodEnd).toEqual(end)
      expect(retrieved!.currentPeriodStart.getTime()).toBe(start.getTime())
      expect(retrieved!.currentPeriodEnd.getTime()).toBe(end.getTime())
    })
  })
})
