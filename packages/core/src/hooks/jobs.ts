/**
 * Jobs Hook
 *
 * Access the job queue from auto-wired features.
 */

'use client';

import { useOptionalFabrk } from '../context';

// HOOK: useJobs

/**
 * Access the job queue
 *
 * @example
 * ```tsx
 * function JobDashboard() {
 *   const { manager } = useJobs()
 *   if (!manager) return <p>Jobs not enabled</p>
 *
 *   const handleEnqueue = async () => {
 *     await manager.enqueue({
 *       type: 'send-email',
 *       payload: { to: 'user@example.com' },
 *     })
 *   }
 *
 *   return <button onClick={handleEnqueue}>&gt; ENQUEUE JOB</button>
 * }
 * ```
 */
export function useJobs() {
  const fabrk = useOptionalFabrk();
  const manager = fabrk?.features?.jobs ?? null;

  return {
    enabled: !!manager,
    manager,
  };
}
