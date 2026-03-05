'use client';

import { useState, useEffect } from 'react';
import { useOptionalFabrk } from '../context';

export function useFeatureFlag(
  name: string,
  context?: { userId?: string; role?: string }
) {
  const fabrk = useOptionalFabrk();
  const manager = fabrk?.features?.featureFlags ?? null;
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!manager) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    manager.isEnabled(name, context).then((result) => {
      if (!cancelled) {
        setEnabled(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, context?.userId, context?.role, manager]);

  return {
    enabled,
    isLoading,
    manager,
  };
}
