/**
 * Notifications Hook
 *
 * Access the notification manager from auto-wired features.
 */

'use client';

import { useOptionalFabrk } from '../context';

// HOOK: useNotifications

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
export function useNotifications() {
  const fabrk = useOptionalFabrk();
  const manager = fabrk?.features?.notifications ?? null;

  return {
    enabled: !!manager,
    manager,
  };
}
