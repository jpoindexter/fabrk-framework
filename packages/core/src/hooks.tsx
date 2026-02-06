/**
 * React Hooks for FABRK Framework
 *
 * Cost tracking, design system, and other framework utilities.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

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
// HOOK: useDesignSystem
// ============================================================================

/**
 * Access design system values
 *
 * @example
 * ```tsx
 * function Component() {
 *   const { theme, radius, font } = useDesignSystem()
 *   return <div className={cn(radius, font)}>Styled</div>
 * }
 * ```
 */
export function useDesignSystem() {
  // This will be enhanced when we have a design system context
  // For now, return static values from the design system
  return {
    theme: 'terminal',
    radius: 'sharp',
    font: 'monospace',
  };
}
