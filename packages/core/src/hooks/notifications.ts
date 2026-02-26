'use client';

import { createFeatureHook } from './create-feature-hook';

/**
 * Access the notification manager
 *
 * Returns the NotificationManager from auto-wired features, providing
 * methods to send, read, and subscribe to notifications.
 *
 * @example
 * ```tsx
 * function NotificationBell() {
 *   const { manager, enabled } = useNotifications()
 *   if (!manager) return null
 *
 *   const handleSend = async () => {
 *     await manager.notify({
 *       type: 'info',
 *       title: 'Welcome',
 *       message: 'You have new updates',
 *       userId: 'user_1',
 *     })
 *   }
 *
 *   return <button onClick={handleSend}>&gt; NOTIFY</button>
 * }
 * ```
 */
export const useNotifications = createFeatureHook('notifications');
