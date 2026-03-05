/**
 * AI Middleware
 *
 * Composable middleware for AI request pipelines:
 * - Budget enforcement: Reject requests when over daily/monthly budget
 * - Provider fallback: Automatic failover between LLM providers
 *
 * These middleware work with the FABRK core middleware system.
 *
 * @example
 * ```ts
 * import { createAIMiddleware, budgetEnforcement, providerFallback } from '@fabrk/ai'
 *
 * const ai = createAIMiddleware()
 *   .use(budgetEnforcement({ daily: 50, monthly: 1000 }))
 *   .use(providerFallback(['claude', 'openai']))
 *
 * await ai.run({ prompt: 'Hello', model: 'claude-sonnet-4-20250514' })
 * ```
 */

import type { CostStore, AICostEvent } from './cost-types'
import { getCostTracker } from './tracker'
import { LLM_DEFAULTS } from './llm/types'

export interface AIRequestContext {
  /** The prompt or messages to send */
  prompt: string
  /** The model to use */
  model: string
  /** The provider (inferred from model if not set) */
  provider?: 'anthropic' | 'openai' | 'other'
  /** Feature name for cost tracking */
  feature?: string
  /** User ID for per-user budget tracking */
  userId?: string
  /** Whether the request was blocked by middleware */
  blocked?: boolean
  /** Reason the request was blocked */
  blockReason?: string
  /** The response (set by the handler) */
  response?: string
  /** Metadata passed through the pipeline */
  metadata?: Record<string, unknown>
}

export type AIMiddlewareFunction = (
  context: AIRequestContext,
  next: () => Promise<void>
) => Promise<void>

export interface AIMiddleware {
  use: (fn: AIMiddlewareFunction) => AIMiddleware
  run: (context: AIRequestContext) => Promise<AIRequestContext>
}

/**
 * Create an AI-specific middleware chain
 */
export function createAIMiddleware(): AIMiddleware {
  const middlewares: AIMiddlewareFunction[] = []

  return {
    use(fn: AIMiddlewareFunction) {
      middlewares.push(fn)
      return this
    },

    async run(context: AIRequestContext) {
      // Create dispatch functions that always call the correct next middleware,
      // even when a middleware calls next() multiple times (e.g., provider fallback)
      function createDispatch(index: number): () => Promise<void> {
        return async () => {
          if (index >= middlewares.length) return
          const middleware = middlewares[index]
          await middleware(context, createDispatch(index + 1))
        }
      }

      await createDispatch(0)()
      return context
    },
  }
}

export interface BudgetConfig {
  /** Daily budget in USD */
  daily?: number
  /** Monthly budget in USD */
  monthly?: number
  /** Alert threshold (0-1). When budget usage exceeds this, log a warning */
  alertThreshold?: number
  /** Cost store for tracking spending */
  store?: CostStore
  /** Called when a request is blocked due to budget */
  onBudgetExceeded?: (context: AIRequestContext, spent: number, budget: number) => void
  /** Called when spending exceeds the alert threshold */
  onBudgetAlert?: (context: AIRequestContext, spent: number, budget: number, percent: number) => void
}

/**
 * Budget enforcement middleware.
 *
 * Blocks AI requests when the daily or monthly budget is exceeded.
 * Optionally fires alerts when spending approaches the threshold.
 *
 * @example
 * ```ts
 * const middleware = createAIMiddleware()
 *   .use(budgetEnforcement({
 *     daily: 50,
 *     monthly: 1000,
 *     alertThreshold: 0.8,
 *     onBudgetExceeded: (ctx, spent, budget) => {
 *       console.warn(`Budget exceeded: $${spent.toFixed(2)}/$${budget}`)
 *     },
 *   }))
 * ```
 */
export function budgetEnforcement(config: BudgetConfig): AIMiddlewareFunction {
  const store = config.store ?? getCostTracker().getStore()
  const alertThreshold = config.alertThreshold ?? 0.8

  return async (context: AIRequestContext, next: () => Promise<void>) => {
    if (config.daily) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const events = await store.query({ startDate: today, endDate: new Date() })
      const dailySpent = events.reduce((sum: number, e: AICostEvent) => sum + e.costUSD, 0)

      if (dailySpent >= config.daily) {
        context.blocked = true
        context.blockReason = `Daily budget exceeded: $${dailySpent.toFixed(2)}/$${config.daily}`
        config.onBudgetExceeded?.(context, dailySpent, config.daily)
        return
      }

      const dailyPercent = dailySpent / config.daily
      if (dailyPercent >= alertThreshold) {
        config.onBudgetAlert?.(context, dailySpent, config.daily, dailyPercent)
      }
    }

    if (config.monthly) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const events = await store.query({ startDate: monthStart, endDate: now })
      const monthlySpent = events.reduce((sum: number, e: AICostEvent) => sum + e.costUSD, 0)

      if (monthlySpent >= config.monthly) {
        context.blocked = true
        context.blockReason = `Monthly budget exceeded: $${monthlySpent.toFixed(2)}/$${config.monthly}`
        config.onBudgetExceeded?.(context, monthlySpent, config.monthly)
        return
      }

      const monthlyPercent = monthlySpent / config.monthly
      if (monthlyPercent >= alertThreshold) {
        config.onBudgetAlert?.(context, monthlySpent, config.monthly, monthlyPercent)
      }
    }

    await next()
  }
}

export type ProviderName = 'claude' | 'openai' | 'ollama'

export interface FallbackConfig {
  /** Ordered list of providers to try (first = primary) */
  providers: ProviderName[]
  /** Model mapping: provider → model name */
  models?: Partial<Record<ProviderName, string>>
  /** Max retries per provider before falling back */
  maxRetries?: number
  /** Called when a provider fails and fallback is triggered */
  onFallback?: (fromProvider: ProviderName, toProvider: ProviderName, error: Error) => void
}

/** Default model for each provider */
const DEFAULT_MODELS: Record<ProviderName, string> = {
  claude: LLM_DEFAULTS.anthropicModel,
  openai: LLM_DEFAULTS.openaiModel,
  ollama: LLM_DEFAULTS.ollamaModel,
}

/**
 * Provider fallback middleware.
 *
 * Automatically falls back to alternative LLM providers when the primary
 * provider fails. Tries providers in order until one succeeds.
 *
 * @example
 * ```ts
 * const middleware = createAIMiddleware()
 *   .use(providerFallback({
 *     providers: ['claude', 'openai', 'ollama'],
 *     models: { claude: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
 *     onFallback: (from, to, err) => {
 *       console.warn(`Falling back from ${from} to ${to}: ${err.message}`)
 *     },
 *   }))
 * ```
 */
export function providerFallback(config: FallbackConfig): AIMiddlewareFunction {
  const maxRetries = config.maxRetries ?? 1

  return async (context: AIRequestContext, next: () => Promise<void>) => {
    const errors: Array<{ provider: ProviderName; error: Error }> = []

    for (let i = 0; i < config.providers.length; i++) {
      const provider = config.providers[i]
      const model = config.models?.[provider] ?? DEFAULT_MODELS[provider]

      context.provider = provider === 'claude' ? 'anthropic' : provider === 'openai' ? 'openai' : 'other'
      context.model = model

      let lastError: Error | undefined
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          await next()
          return
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          if (retry < maxRetries) {
            continue
          }
        }
      }

      if (lastError) {
        errors.push({ provider, error: lastError })

        if (i < config.providers.length - 1) {
          const nextProvider = config.providers[i + 1]
          config.onFallback?.(provider, nextProvider, lastError)
        }
      }
    }

    const errorSummary = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
    context.blocked = true
    context.blockReason = `All providers failed: ${errorSummary}`
  }
}
