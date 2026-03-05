'use client';

import { useOptionalFabrk } from '../context';
import type { FeatureModules } from '../auto-wire';

export function createFeatureHook<K extends keyof NonNullable<FeatureModules>>(key: K) {
  return function useFeature() {
    const fabrk = useOptionalFabrk();
    const manager = fabrk?.features?.[key] ?? null;
    return { enabled: !!manager, manager };
  };
}
