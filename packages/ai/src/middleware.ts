import type { CostStore, AICostEvent } from './cost-types'
import { getCostTracker } from './tracker'
import { LLM_DEFAULTS } from './llm/types'

export interface AIRequestContext {
  prompt: string
  model: string
  provider?: 'anthropic' | 'openai' | 'other'
  feature?: string
  userId?: string
  blocked?: boolean
  blockReason?: string
  response?: string
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
  daily?: number
  monthly?: number
  alertThreshold?: number
  store?: CostStore
  onBudgetExceeded?: (context: AIRequestContext, spent: number, budget: number) => void
  onBudgetAlert?: (context: AIRequestContext, spent: number, budget: number, percent: number) => void
}

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
  providers: ProviderName[]
  models?: Partial<Record<ProviderName, string>>
  maxRetries?: number
  onFallback?: (fromProvider: ProviderName, toProvider: ProviderName, error: Error) => void
}

const DEFAULT_MODELS: Record<ProviderName, string> = {
  claude: LLM_DEFAULTS.anthropicModel,
  openai: LLM_DEFAULTS.openaiModel,
  ollama: LLM_DEFAULTS.ollamaModel,
}

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
