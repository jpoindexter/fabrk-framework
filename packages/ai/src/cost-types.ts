export interface AICostEvent {
  id: string;
  timestamp: Date;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  feature: string;
  prompt?: string;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface CostSummary {
  date: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number;
}

export interface FeatureCost {
  feature: string;
  totalCost: number;
  callCount: number;
  avgCostPerCall: number;
  totalTokens: number;
  successRate: number;
  lastUsed: Date;
}

export interface CostBudgetStatus {
  withinBudget: boolean;
  currentCost: number;
  budget: number;
  percentUsed: number;
  remainingBudget: number;
}

export interface CostStore {
  save(event: AICostEvent): Promise<void>;

  query(filters: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    model?: string;
    provider?: string;
  }): Promise<AICostEvent[]>;

  aggregate(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    }
  ): Promise<CostSummary[]>;

  getFeatureCosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<FeatureCost[]>;
}
