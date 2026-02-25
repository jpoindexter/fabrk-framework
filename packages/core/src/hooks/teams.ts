/**
 * Team Hook
 *
 * Access the team/organization manager from auto-wired features.
 */

'use client';

import { useOptionalFabrk } from '../context';

// HOOK: useTeam

/**
 * Access the team/organization manager
 *
 * Returns the TeamManager from auto-wired features, or null if teams
 * aren't enabled in config.
 *
 * @example
 * ```tsx
 * function TeamPage() {
 *   const { manager, enabled } = useTeam()
 *   if (!manager) return <p>Teams not enabled</p>
 *
 *   const handleCreate = async () => {
 *     await manager.createOrg({ name: 'My Team', slug: 'my-team', ownerId: 'user_1' })
 *   }
 *
 *   return <button onClick={handleCreate}>&gt; CREATE TEAM</button>
 * }
 * ```
 */
export function useTeam() {
  const fabrk = useOptionalFabrk();
  const manager = fabrk?.features?.teams ?? null;

  return {
    enabled: !!manager,
    manager,
  };
}
