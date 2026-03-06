import type {
  AICostEvent,
  CostBudgetStatus,
  CostStore,
} from './cost-types';
import { calculateCost, MODEL_PRICING } from './pricing';
import { InMemoryCostStore } from './in-memory-cost-store';
export { InMemoryCostStore } from './in-memory-cost-store';

export class AICostTracker {
  private store: CostStore;
  private dailyBudget?: number;

  getStore(): CostStore { return this.store }

  constructor(store: CostStore, options?: { dailyBudget?: number }) {
    this.store = store;
    this.dailyBudget = options?.dailyBudget;
  }

  private generateId(): string {
    return `cost_${crypto.randomUUID()}`;
  }

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
        provider: (MODEL_PRICING[model]?.provider ?? errorProviderFallback) as AICostEvent['provider'],
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
  const raw = ((globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined)?.env?.AI_DAILY_BUDGET;
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

export function getCostTracker(): AICostTracker {
  if (!defaultTracker) {
    defaultStore = defaultStore || new InMemoryCostStore();
    defaultTracker = new AICostTracker(defaultStore, { dailyBudget: parseBudgetFromEnv() });
  }
  return defaultTracker;
}

export function setCostStore(store: CostStore): void {
  defaultStore = store;
  defaultTracker = new AICostTracker(store, { dailyBudget: parseBudgetFromEnv() });
}
