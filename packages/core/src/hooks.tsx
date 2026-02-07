/**
 * React Hooks for FABRK Framework
 *
 * Cost tracking, billing, teams, feature flags, and other framework utilities.
 * Design system hooks are provided by @fabrk/themes (separate package).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOptionalFabrk } from './context';

// ============================================================================
// TYPES
// ============================================================================

export interface CostTrackingData {
  /** Today's total cost in USD */
  todaysCost: number;
  /** Daily budget limit */
  budget: number;
  /** Percentage of budget used (0-100+) */
  percentUsed: number;
  /** Whether within daily budget */
  withinBudget: boolean;
  /** Amount over budget (0 if within) */
  overBudgetBy: number;
  /** Remaining budget for today */
  remaining: number;
  /** Cost breakdown by feature */
  featureCosts: Record<string, number>;
  /** Total requests today */
  requestCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh the data */
  refresh: () => Promise<void>;
}

export interface CostSummary {
  today: {
    cost: number;
    requests: number;
    successRate: number;
  };
  budget: {
    daily: number;
    used: number;
    remaining: number;
    percentUsed: number;
  };
  features: Array<{
    feature: string;
    cost: number;
  }>;
}

// ============================================================================
// HOOK: useCostTracking
// ============================================================================

/**
 * Hook to track AI costs in real-time
 *
 * @param options.refreshInterval - Auto-refresh interval in ms (default: 5 min, 0 to disable)
 * @param options.autoRefresh - Enable auto-refresh (default: true)
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const {
 *     todaysCost,
 *     budget,
 *     percentUsed,
 *     withinBudget,
 *     featureCosts,
 *     refresh
 *   } = useCostTracking()
 *
 *   return (
 *     <div>
 *       <p>Today: ${todaysCost.toFixed(2)}</p>
 *       <p>Budget: {percentUsed.toFixed(0)}% used</p>
 *       {!withinBudget && <p className="text-red-500">Over budget!</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCostTracking(options?: {
  refreshInterval?: number;
  autoRefresh?: boolean;
}): CostTrackingData {
  const { refreshInterval = 5 * 60 * 1000, autoRefresh = true } = options || {};

  const [data, setData] = useState<CostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/ai/costs?days=1');

      if (!response.ok) {
        throw new Error('Failed to fetch cost data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(fetchCosts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchCosts]);

  // Build feature costs map
  const featureCosts: Record<string, number> = {};
  if (data?.features) {
    data.features.forEach((f) => {
      featureCosts[f.feature] = f.cost;
    });
  }

  const todaysCost = data?.today.cost ?? 0;
  const budget = data?.budget.daily ?? 50;
  const percentUsed = budget > 0 ? (todaysCost / budget) * 100 : 0;

  return {
    todaysCost,
    budget,
    percentUsed,
    withinBudget: todaysCost <= budget,
    overBudgetBy: Math.max(0, todaysCost - budget),
    remaining: Math.max(0, budget - todaysCost),
    featureCosts,
    requestCount: data?.today.requests ?? 0,
    successRate: data?.today.successRate ?? 1,
    isLoading,
    error,
    refresh: fetchCosts,
  };
}

// ============================================================================
// HOOK: useCostBudget
// ============================================================================

/**
 * Simplified hook for just budget status
 *
 * @example
 * ```tsx
 * function BudgetIndicator() {
 *   const { percentUsed, status } = useCostBudget()
 *   return <Badge variant={status}>{percentUsed}%</Badge>
 * }
 * ```
 */
export function useCostBudget(): {
  percentUsed: number;
  remaining: number;
  status: 'success' | 'warning' | 'danger';
  isLoading: boolean;
} {
  const { percentUsed, remaining, isLoading } = useCostTracking({
    autoRefresh: true,
    refreshInterval: 60 * 1000, // Check every minute
  });

  const status: 'success' | 'warning' | 'danger' =
    percentUsed >= 90 ? 'danger' : percentUsed >= 70 ? 'warning' : 'success';

  return {
    percentUsed,
    remaining,
    status,
    isLoading,
  };
}

// ============================================================================
// HOOK: useFeatureCost
// ============================================================================

/**
 * Get cost for a specific feature
 *
 * @example
 * ```tsx
 * function FeatureStats({ feature }: { feature: string }) {
 *   const { cost, requests } = useFeatureCost(feature)
 *   return <p>{feature}: ${cost} ({requests} calls)</p>
 * }
 * ```
 */
export function useFeatureCost(featureName: string): {
  cost: number;
  requests: number;
  avgCost: number;
  successRate: number;
  isLoading: boolean;
} {
  const [data, setData] = useState<{
    cost: number;
    requests: number;
    avgCost: number;
    successRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatureCost() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai/costs?days=30');

        if (!response.ok) return;

        const result = await response.json();
        const feature = result.features?.find(
          (f: { feature: string }) => f.feature === featureName
        );

        if (feature) {
          setData({
            cost: feature.cost,
            requests: feature.requests,
            avgCost: feature.avgCost,
            successRate: feature.successRate,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeatureCost();
  }, [featureName]);

  return {
    cost: data?.cost ?? 0,
    requests: data?.requests ?? 0,
    avgCost: data?.avgCost ?? 0,
    successRate: data?.successRate ?? 1,
    isLoading,
  };
}

// ============================================================================
// HOOK: useBilling
// ============================================================================

/**
 * Access billing/payment adapter from the plugin registry
 *
 * @example
 * ```tsx
 * function BillingStatus() {
 *   const billing = useBilling()
 *   if (!billing) return <p>Payments not configured</p>
 *
 *   const handleCheckout = async () => {
 *     const result = await billing.createCheckout({
 *       priceId: 'price_xxx',
 *       successUrl: '/success',
 *       cancelUrl: '/cancel',
 *     })
 *     window.location.href = result.url
 *   }
 *
 *   return <button onClick={handleCheckout}>&gt; UPGRADE</button>
 * }
 * ```
 */
export function useBilling() {
  const fabrk = useOptionalFabrk();
  return fabrk?.registry.getPayment() ?? null;
}

// ============================================================================
// HOOK: useTeam
// ============================================================================

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

// ============================================================================
// HOOK: useAPIKeys
// ============================================================================

/**
 * Access API key management from the auth adapter
 *
 * @example
 * ```tsx
 * function ApiKeyManager() {
 *   const apiKeys = useAPIKeys()
 *   if (!apiKeys) return <p>Auth not configured</p>
 *
 *   const handleCreate = async () => {
 *     const result = await apiKeys.create({
 *       userId: 'user_123',
 *       name: 'Production Key',
 *       scopes: ['read', 'write'],
 *     })
 *     console.log('Key:', result.key)
 *   }
 *
 *   return <button onClick={handleCreate}>&gt; CREATE KEY</button>
 * }
 * ```
 */
export function useAPIKeys() {
  const fabrk = useOptionalFabrk();
  const auth = fabrk?.registry.getAuth();

  if (!auth) return null;

  return {
    create: auth.createApiKey.bind(auth),
    revoke: auth.revokeApiKey.bind(auth),
    list: auth.listApiKeys.bind(auth),
    validate: auth.validateApiKey.bind(auth),
  };
}

// ============================================================================
// HOOK: useNotifications
// ============================================================================

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

// ============================================================================
// HOOK: useFeatureFlag
// ============================================================================

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

// ============================================================================
// HOOK: useWebhooks
// ============================================================================

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

// ============================================================================
// HOOK: useJobs
// ============================================================================

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
