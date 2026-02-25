/**
 * AI Cost Tracking System
 *
 * Track costs for Claude, OpenAI, and other AI API calls.
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

import type {
  AICostEvent,
  CostSummary,
  FeatureCost,
  CostBudgetStatus,
  CostStore,
} from './cost-types';
import { calculateCost, MODEL_PRICING } from './pricing';

/**
 * Simple in-memory store for development/testing
 * Replace with database implementation in production
 */
export class InMemoryCostStore implements CostStore {
  private static readonly MAX_EVENTS = 10_000;
  private events: AICostEvent[] = [];

  async save(event: AICostEvent): Promise<void> {
    if (this.events.length >= InMemoryCostStore.MAX_EVENTS) {
      // NOTE: shift() is O(n) — this store is for development/testing only.
      // In high-throughput production, use a persistent CostStore (e.g., Prisma adapter).
      this.events.shift();
    }
    this.events.push(event);
  }

  async query(filters: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    model?: string;
    provider?: string;
  }): Promise<AICostEvent[]> {
    return this.events.filter((event) => {
      if (filters.feature && event.feature !== filters.feature) return false;
      if (filters.startDate && event.timestamp < filters.startDate) return false;
      if (filters.endDate && event.timestamp > filters.endDate) return false;
      if (filters.userId && event.userId !== filters.userId) return false;
      if (filters.model && event.model !== filters.model) return false;
      if (filters.provider && event.provider !== filters.provider) return false;
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
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - day);
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

/**
 * Main cost tracking class
 * Wraps AI API calls to automatically track costs
 */
export class AICostTracker {
  private store: CostStore;
  private dailyBudget?: number;

  getStore(): CostStore { return this.store }

  constructor(store: CostStore, options?: { dailyBudget?: number }) {
    this.store = store;
    this.dailyBudget = options?.dailyBudget;
  }

  /**
   * Generate unique event ID using Web Crypto API
   */
  private generateId(): string {
    return `cost_${crypto.randomUUID()}`;
  }

  /**
   * Generic tracking wrapper for any AI provider call.
   * Handles timing, cost calculation, event persistence, and content extraction.
   */
  private async trackCall<T>(options: {
    model: string;
    feature: string;
    prompt?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    errorProviderFallback: string;
    fn: () => Promise<unknown>;
    extractContent: (response: unknown) => string;
    extractTokens: (response: unknown) => { promptTokens: number; completionTokens: number };
  }): Promise<T> {
    const { model, feature, prompt, userId, metadata, errorProviderFallback, fn, extractContent, extractTokens } = options;

    // Enforce daily budget if configured
    if (this.dailyBudget !== undefined) {
      const status = await this.checkBudget(userId)
      if (!status.withinBudget) {
        throw new Error(
          `Daily AI budget exceeded: $${status.currentCost.toFixed(4)} / $${this.dailyBudget}. ` +
          `Query getCostTracker().getTodaysCost() for current spend.`
        )
      }
    }

    const startTime = Date.now();

    try {
      const response = await fn();
      const durationMs = Date.now() - startTime;

      const { promptTokens: rawPrompt, completionTokens: rawCompletion } = extractTokens(response);
      const promptTokens = Math.max(0, rawPrompt);
      const completionTokens = Math.max(0, rawCompletion);
      const { costUSD, provider } = calculateCost(model, promptTokens, completionTokens);

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

      const content = extractContent(response);
      return (content !== undefined && content !== null ? content : response) as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const event: AICostEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        model,
        provider: MODEL_PRICING[model]?.provider || errorProviderFallback as AICostEvent['provider'],
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

      throw error;
    }
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
    return this.trackCall<T>({
      model,
      feature,
      prompt,
      userId,
      metadata,
      errorProviderFallback: 'other',
      fn,
      extractContent: (response) => {
        const r = response as { content: Array<{ type: string; text?: string }> };
        const textBlock = r.content.find((c) => c.type === 'text');
        return textBlock?.text ?? '';
      },
      extractTokens: (response) => {
        const r = response as { usage: { input_tokens: number; output_tokens: number } };
        return {
          promptTokens: r.usage.input_tokens,
          completionTokens: r.usage.output_tokens,
        };
      },
    });
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
    return this.trackCall<T>({
      model,
      feature,
      prompt,
      userId,
      metadata,
      errorProviderFallback: 'openai',
      fn,
      extractContent: (response) => {
        const r = response as { choices: Array<{ message: { content: string } }> };
        return r.choices[0]?.message.content ?? '';
      },
      extractTokens: (response) => {
        const r = response as { usage: { prompt_tokens: number; completion_tokens: number } };
        return {
          promptTokens: r.usage.prompt_tokens,
          completionTokens: r.usage.completion_tokens,
        };
      },
    });
  }

  /**
   * Check if within daily budget.
   * @security TOCTOU race: concurrent requests can all pass the budget check before any completes. In high-concurrency environments, use atomic reserve-and-deduct at the store level.
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

let defaultStore: CostStore | null = null;
let defaultTracker: AICostTracker | null = null;

/**
 * Parse AI_DAILY_BUDGET from environment.
 * Returns undefined when unset, throws on invalid values.
 * Strict: AI_DAILY_BUDGET=0 is honoured (blocks all AI calls).
 */
function parseBudgetFromEnv(): number | undefined {
  const raw = process.env.AI_DAILY_BUDGET;
  if (raw === undefined || raw === '') return undefined;
  const parsed = Number(raw);
  if (!isFinite(parsed) || parsed < 0) {
    throw new Error(
      `Invalid AI_DAILY_BUDGET: "${raw}" is not a valid non-negative number. ` +
      `Set a valid dollar amount (e.g. AI_DAILY_BUDGET=10) or unset the variable to disable budget enforcement.`
    );
  }
  return parsed;
}

/**
 * Get the default cost tracker instance.
 * Uses in-memory store by default, override with setCostStore().
 */
export function getCostTracker(): AICostTracker {
  if (!defaultTracker) {
    defaultStore = defaultStore || new InMemoryCostStore();
    defaultTracker = new AICostTracker(defaultStore, { dailyBudget: parseBudgetFromEnv() });
  }
  return defaultTracker;
}

/**
 * Set custom cost store (call at app startup)
 */
export function setCostStore(store: CostStore): void {
  defaultStore = store;
  defaultTracker = new AICostTracker(store, { dailyBudget: parseBudgetFromEnv() });
}
