'use client';

import { createFeatureHook } from './create-feature-hook';

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
export const useWebhooks = createFeatureHook('webhooks');
