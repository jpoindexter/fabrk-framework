/**
 * AI Cost Tracking System
 *
 * Track costs for Claude, OpenAI, and other AI API calls.
 * Essential for developers who need visibility into AI spending.
 *
 * @example
 * const tracker = new AICostTracker(store)
 * const result = await tracker.trackClaudeCall({
 *   model: 'claude-sonnet-4-20250514',
 *   feature: 'generate-user-page',
 *   prompt: 'Create a user settings page...',
 *   fn: async (client) => client.messages.create({ ... })
 * })
 */

// Optional logger - falls back to console if not available
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// ============================================================================
// TYPES
// ============================================================================

export interface AICostEvent {
  id: string;
  timestamp: Date;
  model: string;
  provider: 'anthropic' | 'openai' | 'other';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  feature: string;
  prompt?: string; // Truncated for storage
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

// ============================================================================
// PRICING (Updated for 2025)
// ============================================================================

/**
 * AI model pricing per 1K tokens
 * Update these as providers change rates
 */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; provider: 'anthropic' | 'openai' | 'other' }
> = {
  // Anthropic Claude models
  'claude-sonnet-4-20250514': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  'claude-opus-4-20250514': {
    input: 0.015,
    output: 0.075,
    provider: 'anthropic',
  },
  'claude-3-5-sonnet-20241022': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  'claude-3-5-haiku-20241022': {
    input: 0.0008,
    output: 0.004,
    provider: 'anthropic',
  },
  'claude-3-opus-20240229': {
    input: 0.015,
    output: 0.075,
    provider: 'anthropic',
  },

  // OpenAI models
  'gpt-4o': {
    input: 0.005,
    output: 0.015,
    provider: 'openai',
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
    provider: 'openai',
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    provider: 'openai',
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
    provider: 'openai',
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
    provider: 'openai',
  },
  'o1': {
    input: 0.015,
    output: 0.06,
    provider: 'openai',
  },
  'o1-mini': {
    input: 0.003,
    output: 0.012,
    provider: 'openai',
  },
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { costUSD: number; provider: 'anthropic' | 'openai' | 'other' } {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    logger.warn(`Unknown model pricing: ${model}, using default estimate`);
    return {
      costUSD: ((promptTokens + completionTokens) / 1000) * 0.01,
      provider: 'other',
    };
  }

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;

  return {
    costUSD: inputCost + outputCost,
    provider: pricing.provider,
  };
}

// ============================================================================
// COST STORE INTERFACE
// ============================================================================

/**
 * Interface for cost storage backends
 * Implement this with your database (Prisma, Supabase, etc.)
 */
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

// ============================================================================
// IN-MEMORY STORE (for development)
// ============================================================================

/**
 * Simple in-memory store for development/testing
 * Replace with database implementation in production
 */
export class InMemoryCostStore implements CostStore {
  private events: AICostEvent[] = [];

  async save(event: AICostEvent): Promise<void> {
    this.events.push(event);
  }

  async query(filters: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    model?: string;
  }): Promise<AICostEvent[]> {
    return this.events.filter((event) => {
      if (filters.feature && event.feature !== filters.feature) return false;
      if (filters.startDate && event.timestamp < filters.startDate) return false;
      if (filters.endDate && event.timestamp > filters.endDate) return false;
      if (filters.userId && event.userId !== filters.userId) return false;
      if (filters.model && event.model !== filters.model) return false;
      return true;
    });
  }

  async aggregate(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: { startDate?: Date; endDate?: Date; userId?: string }
  ): Promise<CostSummary[]> {
    const events = await this.query(filters || {});
    const grouped = new Map<string, AICostEvent[]>();

    events.forEach((event) => {
      const date = this.getDateKey(event.timestamp, period);
      const existing = grouped.get(date) || [];
      existing.push(event);
      grouped.set(date, existing);
    });

    return Array.from(grouped.entries()).map(([date, events]) => ({
      date,
      totalCost: events.reduce((sum, e) => sum + e.costUSD, 0),
      totalTokens: events.reduce((sum, e) => sum + e.totalTokens, 0),
      requestCount: events.length,
      successCount: events.filter((e) => e.success).length,
      errorCount: events.filter((e) => !e.success).length,
      avgDurationMs:
        events.reduce((sum, e) => sum + e.durationMs, 0) / events.length,
    }));
  }

  async getFeatureCosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<FeatureCost[]> {
    const events = await this.query(filters || {});
    const grouped = new Map<string, AICostEvent[]>();

    events.forEach((event) => {
      const existing = grouped.get(event.feature) || [];
      existing.push(event);
      grouped.set(event.feature, existing);
    });

    return Array.from(grouped.entries()).map(([feature, events]) => {
      const totalCost = events.reduce((sum, e) => sum + e.costUSD, 0);
      const successCount = events.filter((e) => e.success).length;

      return {
        feature,
        totalCost,
        callCount: events.length,
        avgCostPerCall: totalCost / events.length,
        totalTokens: events.reduce((sum, e) => sum + e.totalTokens, 0),
        successRate: successCount / events.length,
        lastUsed: events.reduce(
          (latest, e) => (e.timestamp > latest ? e.timestamp : latest),
          events[0].timestamp
        ),
      };
    });
  }

  private getDateKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        return d.toISOString().split('T')[0];
      case 'weekly': {
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d.setDate(diff));
        return weekStart.toISOString().split('T')[0];
      }
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // For testing
  clear(): void {
    this.events = [];
  }

  getAll(): AICostEvent[] {
    return [...this.events];
  }
}

// ============================================================================
// COST TRACKER
// ============================================================================

/**
 * Main cost tracking class
 * Wraps AI API calls to automatically track costs
 */
export class AICostTracker {
  private store: CostStore;
  private dailyBudget?: number;

  constructor(store: CostStore, options?: { dailyBudget?: number }) {
    this.store = store;
    this.dailyBudget = options?.dailyBudget;
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Track a Claude API call
   */
  async trackClaudeCall<T>({
    model,
    feature,
    prompt,
    userId,
    metadata,
    fn,
  }: {
    model: string;
    feature: string;
    prompt?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    fn: () => Promise<{
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  }): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await fn();
      const durationMs = Date.now() - startTime;

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const { costUSD, provider } = calculateCost(
        model,
        promptTokens,
        completionTokens
      );

      const event: AICostEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        model,
        provider,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUSD,
        feature,
        prompt: prompt?.substring(0, 500),
        success: true,
        durationMs,
        userId,
        metadata,
      };

      await this.store.save(event);

      logger.info('AI call tracked', {
        feature,
        model,
        costUSD: costUSD.toFixed(4),
        tokens: promptTokens + completionTokens,
        durationMs,
      });

      // Return text content
      const textContent = response.content.find((c) => c.type === 'text');
      return (textContent?.text ?? response) as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const event: AICostEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        model,
        provider: MODEL_PRICING[model]?.provider || 'other',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        feature,
        prompt: prompt?.substring(0, 500),
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
        userId,
        metadata,
      };

      await this.store.save(event);

      logger.error('AI call failed', {
        feature,
        model,
        error: event.errorMessage,
        durationMs,
      });

      throw error;
    }
  }

  /**
   * Track an OpenAI API call
   */
  async trackOpenAICall<T>({
    model,
    feature,
    prompt,
    userId,
    metadata,
    fn,
  }: {
    model: string;
    feature: string;
    prompt?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    fn: () => Promise<{
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    }>;
  }): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await fn();
      const durationMs = Date.now() - startTime;

      const promptTokens = response.usage.prompt_tokens;
      const completionTokens = response.usage.completion_tokens;
      const { costUSD, provider } = calculateCost(
        model,
        promptTokens,
        completionTokens
      );

      const event: AICostEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        model,
        provider,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUSD,
        feature,
        prompt: prompt?.substring(0, 500),
        success: true,
        durationMs,
        userId,
        metadata,
      };

      await this.store.save(event);

      logger.info('AI call tracked', {
        feature,
        model,
        costUSD: costUSD.toFixed(4),
        tokens: promptTokens + completionTokens,
        durationMs,
      });

      return (response.choices[0]?.message.content ?? response) as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const event: AICostEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        model,
        provider: MODEL_PRICING[model]?.provider || 'openai',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        feature,
        prompt: prompt?.substring(0, 500),
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
        userId,
        metadata,
      };

      await this.store.save(event);

      logger.error('AI call failed', {
        feature,
        model,
        error: event.errorMessage,
        durationMs,
      });

      throw error;
    }
  }

  /**
   * Get cost summary for a period
   */
  async getCostSummary(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: { startDate?: Date; endDate?: Date; userId?: string }
  ): Promise<CostSummary[]> {
    return this.store.aggregate(period, filters);
  }

  /**
   * Get costs by feature
   */
  async getFeatureCosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<FeatureCost[]> {
    return this.store.getFeatureCosts(filters);
  }

  /**
   * Check if within daily budget
   */
  async checkBudget(userId?: string): Promise<CostBudgetStatus> {
    if (!this.dailyBudget) {
      return {
        withinBudget: true,
        currentCost: 0,
        budget: Infinity,
        percentUsed: 0,
        remainingBudget: Infinity,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this.store.query({
      startDate: today,
      userId,
    });

    const currentCost = events.reduce((sum, e) => sum + e.costUSD, 0);
    const percentUsed = (currentCost / this.dailyBudget) * 100;

    return {
      withinBudget: currentCost <= this.dailyBudget,
      currentCost,
      budget: this.dailyBudget,
      percentUsed,
      remainingBudget: Math.max(0, this.dailyBudget - currentCost),
    };
  }

  /**
   * Get today's cost
   */
  async getTodaysCost(userId?: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this.store.query({
      startDate: today,
      userId,
    });

    return events.reduce((sum, e) => sum + e.costUSD, 0);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultStore: CostStore | null = null;
let defaultTracker: AICostTracker | null = null;

/**
 * Get the default cost tracker instance
 * Uses in-memory store by default, override with setCostStore()
 */
export function getCostTracker(): AICostTracker {
  if (!defaultTracker) {
    defaultStore = defaultStore || new InMemoryCostStore();
    defaultTracker = new AICostTracker(defaultStore, {
      dailyBudget: Number(process.env.AI_DAILY_BUDGET) || undefined,
    });
  }
  return defaultTracker;
}

/**
 * Set custom cost store (call at app startup)
 */
export function setCostStore(store: CostStore): void {
  defaultStore = store;
  defaultTracker = new AICostTracker(store, {
    dailyBudget: Number(process.env.AI_DAILY_BUDGET) || undefined,
  });
}
