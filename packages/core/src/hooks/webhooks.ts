/**
 * Webhooks Hook
 *
 * Access the webhook manager from auto-wired features.
 */

'use client';

import { useOptionalFabrk } from '../context';

// HOOK: useWebhooks

/**
 * Access the webhook manager
 *
 * @example
 * ```tsx
 * function WebhookAdmin() {
 *   const { manager } = useWebhooks()
 *   if (!manager) return <p>Webhooks not enabled</p>
 *
 *   const handleRegister = async () => {
 *     await manager.register({
 *       url: 'https://example.com/hook',
 *       events: ['user.created'],
 *     })
 *   }
 *
 *   return <button onClick={handleRegister}>&gt; ADD WEBHOOK</button>
 * }
 * ```
 */
export function useWebhooks() {
  const fabrk = useOptionalFabrk();
  const manager = fabrk?.features?.webhooks ?? null;

  return {
    enabled: !!manager,
    manager,
  };
}
