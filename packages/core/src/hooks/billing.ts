/**
 * Billing Hook
 *
 * Access billing/payment adapter from the plugin registry.
 */

'use client';

import { useOptionalFabrk } from '../context';

/**
 * Access billing/payment adapter from the plugin registry
 *
 * @example
 * ```tsx
 * function BillingStatus() {
 *   const billing = useBilling()
 *   if (!billing) return <p>Payments not configured</p>
 *
 *   const handleCheckout = async () => {
 *     const result = await billing.createCheckout({
 *       priceId: 'price_xxx',
 *       successUrl: '/success',
 *       cancelUrl: '/cancel',
 *     })
 *     window.location.href = result.url
 *   }
 *
 *   return <button onClick={handleCheckout}>&gt; UPGRADE</button>
 * }
 * ```
 */
export function useBilling() {
  const fabrk = useOptionalFabrk();
  return fabrk?.registry.getPayment() ?? null;
}
