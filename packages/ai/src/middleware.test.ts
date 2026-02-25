import { describe, it, expect, vi } from 'vitest'
import {
  createAIMiddleware,
  budgetEnforcement,
  providerFallback,
} from './middleware'

describe('createAIMiddleware', () => {
  it('should create a middleware chain', async () => {
    const order: string[] = []

    const middleware = createAIMiddleware()
      .use(async (ctx, next) => {
        order.push('before-a')
        await next()
        order.push('after-a')
      })
      .use(async (ctx, next) => {
        order.push('before-b')
        await next()
        order.push('after-b')
      })

    await middleware.run({ prompt: 'test', model: 'test' })
    expect(order).toEqual(['before-a', 'before-b', 'after-b', 'after-a'])
  })

  it('should return the context', async () => {
    const middleware = createAIMiddleware()
      .use(async (ctx, next) => {
        ctx.response = 'hello'
        await next()
      })

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.response).toBe('hello')
  })
})

describe('budgetEnforcement', () => {
  it('should allow requests within budget', async () => {
    const middleware = createAIMiddleware()
      .use(budgetEnforcement({ daily: 100 }))

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.blocked).toBeUndefined()
  })

  it('should block requests when daily budget is exceeded', async () => {
    const { InMemoryCostStore } = await import('./tracker')
    const store = new InMemoryCostStore()

    // Add cost events that exceed budget
    await store.save({
      id: '1',
      timestamp: new Date(),
      model: 'test',
      provider: 'anthropic',
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      costUSD: 60,
      feature: 'test',
      success: true,
      durationMs: 100,
    })

    const onExceeded = vi.fn()
    const middleware = createAIMiddleware()
      .use(budgetEnforcement({
        daily: 50,
        store,
        onBudgetExceeded: onExceeded,
      }))

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.blocked).toBe(true)
    expect(result.blockReason).toContain('Daily budget exceeded')
    expect(onExceeded).toHaveBeenCalled()
  })

  it('should fire alert when approaching threshold', async () => {
    const { InMemoryCostStore } = await import('./tracker')
    const store = new InMemoryCostStore()

    await store.save({
      id: '1',
      timestamp: new Date(),
      model: 'test',
      provider: 'anthropic',
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      costUSD: 45,
      feature: 'test',
      success: true,
      durationMs: 100,
    })

    const onAlert = vi.fn()
    const middleware = createAIMiddleware()
      .use(budgetEnforcement({
        daily: 50,
        alertThreshold: 0.8,
        store,
        onBudgetAlert: onAlert,
      }))

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.blocked).toBeUndefined()
    expect(onAlert).toHaveBeenCalled()
  })
})

describe('providerFallback', () => {
  it('should use the first provider when it succeeds', async () => {
    const middleware = createAIMiddleware()
      .use(providerFallback({
        providers: ['claude', 'openai'],
      }))
      .use(async (ctx, next) => {
        ctx.response = `response from ${ctx.provider}`
        await next()
      })

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.provider).toBe('anthropic')
    expect(result.response).toBe('response from anthropic')
  })

  it('should set model from config', async () => {
    const middleware = createAIMiddleware()
      .use(providerFallback({
        providers: ['claude'],
        models: { claude: 'claude-opus-4-20250514' },
      }))
      .use(async (ctx, next) => {
        ctx.response = ctx.model
        await next()
      })

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.model).toBe('claude-opus-4-20250514')
  })

  it('should call onFallback when provider fails', async () => {
    const onFallback = vi.fn()
    let callCount = 0

    const middleware = createAIMiddleware()
      .use(providerFallback({
        providers: ['claude', 'openai'],
        maxRetries: 0,
        onFallback,
      }))
      .use(async (ctx, next) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Claude API down')
        }
        ctx.response = 'fallback success'
        await next()
      })

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(onFallback).toHaveBeenCalledWith('claude', 'openai', expect.any(Error))
    expect(result.response).toBe('fallback success')
  })

  it('should block when all providers fail', async () => {
    const middleware = createAIMiddleware()
      .use(providerFallback({
        providers: ['claude', 'openai'],
        maxRetries: 0,
      }))
      .use(async () => {
        throw new Error('API down')
      })

    const result = await middleware.run({ prompt: 'test', model: 'test' })
    expect(result.blocked).toBe(true)
    expect(result.blockReason).toContain('All providers failed')
  })
})
