'use client';

import { useOptionalFabrk } from '../context';
import type { FeatureModules } from '../auto-wire';

/**
 * Factory that creates a typed feature hook for any key in FeatureModules.
 *
 * @example
 * ```ts
 * export const useJobs = createFeatureHook('jobs')
 * // Returns { enabled: boolean, manager: JobQueue | null }
 * ```
 */
export function createFeatureHook<K extends keyof NonNullable<FeatureModules>>(key: K) {
  return function useFeature() {
    const fabrk = useOptionalFabrk();
    const manager = fabrk?.features?.[key] ?? null;
    return { enabled: !!manager, manager };
  };
}
