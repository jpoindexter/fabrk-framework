'use client';

import { useState, useEffect } from 'react';
import { useOptionalFabrk } from '../context';

/**
 * Check if a specific feature flag is enabled
 *
 * Uses the FeatureFlagManager from auto-wired features to evaluate
 * flags with rollout percentages, user targeting, and role targeting.
 *
 * @example
 * ```tsx
 * function NewFeature() {
 *   const { enabled, isLoading } = useFeatureFlag('new-dashboard')
 *   if (isLoading) return <Skeleton />
 *   if (!enabled) return null
 *   return <NewDashboard />
 * }
 *
 * // With user context for targeted rollouts
 * function BetaFeature() {
 *   const { enabled } = useFeatureFlag('beta-ui', { userId: 'user_123', role: 'admin' })
 *   if (!enabled) return null
 *   return <BetaUI />
 * }
 * ```
 */
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
