import { describe, it, expect, vi } from 'vitest'
import { AICostTracker, InMemoryCostStore } from './tracker'
import { calculateCost } from './pricing'
import type { AICostEvent } from './cost-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return new InMemoryCostStore()
}

function makeClaudeResponse(opts: {
  text?: string
  inputTokens?: number
  outputTokens?: number
} = {}) {
  return {
    content: [{ type: 'text', text: opts.text ?? 'hello' }],
    usage: {
      input_tokens: opts.inputTokens ?? 100,
      output_tokens: opts.outputTokens ?? 50,
    },
  }
}

function makeOpenAIResponse(opts: {
  text?: string
  promptTokens?: number
  completionTokens?: number
} = {}) {
  return {
    choices: [{ message: { content: opts.text ?? 'hello' } }],
    usage: {
      prompt_tokens: opts.promptTokens ?? 100,
      completion_tokens: opts.completionTokens ?? 50,
    },
  }
}

// Seed the store with a synthetic event for budget tests
async function seedCostEvent(store: InMemoryCostStore, costUSD: number) {
  const event: AICostEvent = {
    id: 'seed_1',
    timestamp: new Date(),
    model: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costUSD,
    feature: 'seed',
    success: true,
    durationMs: 1,
  }
  await store.save(event)
}

// ---------------------------------------------------------------------------
// AICostTracker construction
// ---------------------------------------------------------------------------

describe('AICostTracker construction', () => {
  it('exposes the store via getStore()', () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)
    expect(tracker.getStore()).toBe(store)
  })

  it('accepts optional dailyBudget', () => {
    const store = makeStore()
    // No throw means construction succeeds
    expect(() => new AICostTracker(store, { dailyBudget: 5 })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// trackClaudeCall — success path
// ---------------------------------------------------------------------------

describe('trackClaudeCall — success', () => {
  it('saves an event with correct tokens, cost, and provider', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      prompt: 'say hi',
      fn: async () => makeClaudeResponse({ inputTokens: 200, outputTokens: 100 }),
    })

    const events = await store.query({})
    expect(events).toHaveLength(1)

    const ev = events[0]
    expect(ev.provider).toBe('anthropic')
    expect(ev.model).toBe('claude-3-5-haiku-20241022')
    expect(ev.feature).toBe('test-feature')
    expect(ev.promptTokens).toBe(200)
    expect(ev.completionTokens).toBe(100)
    expect(ev.totalTokens).toBe(300)
    expect(ev.success).toBe(true)
    expect(ev.errorMessage).toBeUndefined()
    // cost = (200/1000)*0.0008 + (100/1000)*0.004 = 0.00016 + 0.0004 = 0.00056
    expect(ev.costUSD).toBeCloseTo(0.00056, 8)
    expect(ev.id).toMatch(/^cost_/)
    expect(ev.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('returns extracted text content', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    const result = await tracker.trackClaudeCall<string>({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      fn: async () => makeClaudeResponse({ text: 'response text' }),
    })

    expect(result).toBe('response text')
  })

  it('saves prompt (truncated at 500 chars)', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)
    const longPrompt = 'a'.repeat(600)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      prompt: longPrompt,
      fn: async () => makeClaudeResponse(),
    })

    const ev = (await store.query({}))[0]
    expect(ev.prompt).toHaveLength(500)
    expect(ev.prompt).toBe('a'.repeat(500))
  })

  it('saves userId and metadata', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      userId: 'user-42',
      metadata: { key: 'value' },
      fn: async () => makeClaudeResponse(),
    })

    const ev = (await store.query({}))[0]
    expect(ev.userId).toBe('user-42')
    expect(ev.metadata).toEqual({ key: 'value' })
  })
})

// ---------------------------------------------------------------------------
// trackClaudeCall — error path
// ---------------------------------------------------------------------------

describe('trackClaudeCall — error', () => {
  it('saves a failure event and re-throws', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)
    const boom = new Error('API down')

    await expect(
      tracker.trackClaudeCall({
        model: 'claude-3-5-haiku-20241022',
        feature: 'test-feature',
        fn: async () => { throw boom },
      })
    ).rejects.toThrow('API down')

    const events = await store.query({})
    expect(events).toHaveLength(1)

    const ev = events[0]
    expect(ev.success).toBe(false)
    expect(ev.errorMessage).toBe('API down')
    expect(ev.costUSD).toBe(0)
    expect(ev.promptTokens).toBe(0)
    expect(ev.completionTokens).toBe(0)
    expect(ev.provider).toBe('anthropic') // from MODEL_PRICING lookup
  })

  it('uses errorProviderFallback for unknown model on error', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await expect(
      tracker.trackClaudeCall({
        model: 'unknown-model-xyz',
        feature: 'test-feature',
        fn: async () => { throw new Error('fail') },
      })
    ).rejects.toThrow('fail')

    const ev = (await store.query({}))[0]
    expect(ev.provider).toBe('other') // Claude errorProviderFallback
  })
})

// ---------------------------------------------------------------------------
// trackOpenAICall — success path
// ---------------------------------------------------------------------------

describe('trackOpenAICall — success', () => {
  it('saves an event with correct tokens, cost, and provider', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackOpenAICall({
      model: 'gpt-4o-mini',
      feature: 'openai-feature',
      fn: async () => makeOpenAIResponse({ promptTokens: 500, completionTokens: 200 }),
    })

    const ev = (await store.query({}))[0]
    expect(ev.provider).toBe('openai')
    expect(ev.model).toBe('gpt-4o-mini')
    expect(ev.promptTokens).toBe(500)
    expect(ev.completionTokens).toBe(200)
    expect(ev.totalTokens).toBe(700)
    expect(ev.success).toBe(true)
    // cost = (500/1000)*0.00015 + (200/1000)*0.0006 = 0.000075 + 0.00012 = 0.000195
    expect(ev.costUSD).toBeCloseTo(0.000195, 8)
  })

  it('returns first choice content', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    const result = await tracker.trackOpenAICall<string>({
      model: 'gpt-4o-mini',
      feature: 'openai-feature',
      fn: async () => makeOpenAIResponse({ text: 'openai reply' }),
    })

    expect(result).toBe('openai reply')
  })
})

// ---------------------------------------------------------------------------
// trackOpenAICall — error path
// ---------------------------------------------------------------------------

describe('trackOpenAICall — error', () => {
  it('saves a failure event with openai provider and re-throws', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await expect(
      tracker.trackOpenAICall({
        model: 'unknown-openai-model',
        feature: 'openai-feature',
        fn: async () => { throw new Error('rate limited') },
      })
    ).rejects.toThrow('rate limited')

    const ev = (await store.query({}))[0]
    expect(ev.success).toBe(false)
    expect(ev.errorMessage).toBe('rate limited')
    expect(ev.provider).toBe('openai') // errorProviderFallback for OpenAI
    expect(ev.costUSD).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// checkBudget
// ---------------------------------------------------------------------------

describe('checkBudget — no budget set', () => {
  it('returns withinBudget: true and Infinity', async () => {
    const tracker = new AICostTracker(makeStore())
    const status = await tracker.checkBudget()

    expect(status.withinBudget).toBe(true)
    expect(status.budget).toBe(Infinity)
    expect(status.currentCost).toBe(0)
    expect(status.percentUsed).toBe(0)
    expect(status.remainingBudget).toBe(Infinity)
  })
})

describe('checkBudget — budget set', () => {
  it('returns within budget when under limit', async () => {
    const store = makeStore()
    await seedCostEvent(store, 3)
    const tracker = new AICostTracker(store, { dailyBudget: 10 })

    const status = await tracker.checkBudget()

    expect(status.withinBudget).toBe(true)
    expect(status.currentCost).toBeCloseTo(3, 6)
    expect(status.budget).toBe(10)
    expect(status.percentUsed).toBeCloseTo(30, 4)
    expect(status.remainingBudget).toBeCloseTo(7, 6)
  })

  it('returns over budget when limit exceeded', async () => {
    const store = makeStore()
    await seedCostEvent(store, 15)
    const tracker = new AICostTracker(store, { dailyBudget: 10 })

    const status = await tracker.checkBudget()

    expect(status.withinBudget).toBe(false)
    expect(status.currentCost).toBeCloseTo(15, 6)
    expect(status.remainingBudget).toBe(0) // clamped to 0
  })

  it('returns exactly at budget as within budget', async () => {
    const store = makeStore()
    await seedCostEvent(store, 10)
    const tracker = new AICostTracker(store, { dailyBudget: 10 })

    const status = await tracker.checkBudget()

    expect(status.withinBudget).toBe(true) // <= not <
  })
})

// ---------------------------------------------------------------------------
// Daily budget enforcement — trackClaudeCall throws when over
// ---------------------------------------------------------------------------

describe('daily budget enforcement', () => {
  it('throws before making the AI call when over budget', async () => {
    const store = makeStore()
    await seedCostEvent(store, 20)
    const tracker = new AICostTracker(store, { dailyBudget: 10 })

    const fn = vi.fn(async () => makeClaudeResponse())

    await expect(
      tracker.trackClaudeCall({
        model: 'claude-3-5-haiku-20241022',
        feature: 'test-feature',
        fn,
      })
    ).rejects.toThrow(/Daily AI budget exceeded/)

    // fn must never be called — we abort before the API hit
    expect(fn).not.toHaveBeenCalled()
    // Store should still have only the seed event
    expect(await store.query({})).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// getTodaysCost
// ---------------------------------------------------------------------------

describe('getTodaysCost', () => {
  it('returns 0 when no events', async () => {
    const tracker = new AICostTracker(makeStore())
    expect(await tracker.getTodaysCost()).toBe(0)
  })

  it('sums costUSD of all today events', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'f1',
      fn: async () => makeClaudeResponse({ inputTokens: 1000, outputTokens: 500 }),
    })
    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'f2',
      fn: async () => makeClaudeResponse({ inputTokens: 2000, outputTokens: 1000 }),
    })

    const total = await tracker.getTodaysCost()
    // call1: (1000/1000)*0.0008 + (500/1000)*0.004 = 0.0008 + 0.002 = 0.0028
    // call2: (2000/1000)*0.0008 + (1000/1000)*0.004 = 0.0016 + 0.004 = 0.0056
    // total: 0.0084
    expect(total).toBeCloseTo(0.0084, 6)
  })

  it('excludes yesterday events', async () => {
    const store = makeStore()
    // Inject a yesterday event directly
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const oldEvent: AICostEvent = {
      id: 'old_1',
      timestamp: yesterday,
      model: 'claude-3-5-haiku-20241022',
      provider: 'anthropic',
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      costUSD: 99,
      feature: 'old',
      success: true,
      durationMs: 1,
    }
    await store.save(oldEvent)

    const tracker = new AICostTracker(store)
    expect(await tracker.getTodaysCost()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Token validation — negative tokens clamped to 0
// ---------------------------------------------------------------------------

describe('token validation', () => {
  it('clamps negative input tokens to 0', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      fn: async () => makeClaudeResponse({ inputTokens: -50, outputTokens: 100 }),
    })

    const ev = (await store.query({}))[0]
    expect(ev.promptTokens).toBe(0)
    expect(ev.completionTokens).toBe(100)
    expect(ev.totalTokens).toBe(100)
    expect(ev.costUSD).toBeGreaterThanOrEqual(0)
  })

  it('clamps negative output tokens to 0', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      fn: async () => makeClaudeResponse({ inputTokens: 100, outputTokens: -200 }),
    })

    const ev = (await store.query({}))[0]
    expect(ev.completionTokens).toBe(0)
    expect(ev.totalTokens).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Prompt truncation
// ---------------------------------------------------------------------------

describe('prompt truncation', () => {
  it('stores prompts up to 500 chars as-is', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)
    const prompt = 'x'.repeat(500)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      prompt,
      fn: async () => makeClaudeResponse(),
    })

    expect((await store.query({}))[0].prompt).toHaveLength(500)
  })

  it('truncates prompts over 500 chars', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)
    const prompt = 'y'.repeat(501)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      prompt,
      fn: async () => makeClaudeResponse(),
    })

    const ev = (await store.query({}))[0]
    expect(ev.prompt).toHaveLength(500)
  })

  it('stores undefined prompt as undefined', async () => {
    const store = makeStore()
    const tracker = new AICostTracker(store)

    await tracker.trackClaudeCall({
      model: 'claude-3-5-haiku-20241022',
      feature: 'test-feature',
      fn: async () => makeClaudeResponse(),
    })

    expect((await store.query({}))[0].prompt).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// InMemoryCostStore.query — filtering
// ---------------------------------------------------------------------------

describe('InMemoryCostStore.query', () => {
  async function buildStore() {
    const store = makeStore()
    const base: Omit<AICostEvent, 'id' | 'feature' | 'model' | 'provider'> = {
      timestamp: new Date(),
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costUSD: 0.001,
      success: true,
      durationMs: 10,
    }
    await store.save({ ...base, id: '1', feature: 'feat-a', model: 'claude-3-5-haiku-20241022', provider: 'anthropic', userId: 'u1' })
    await store.save({ ...base, id: '2', feature: 'feat-b', model: 'gpt-4o-mini', provider: 'openai', userId: 'u2' })
    await store.save({ ...base, id: '3', feature: 'feat-a', model: 'gpt-4o', provider: 'openai', userId: 'u1' })
    return store
  }

  it('returns all events with no filters', async () => {
    const store = await buildStore()
    expect(await store.query({})).toHaveLength(3)
  })

  it('filters by feature', async () => {
    const store = await buildStore()
    const results = await store.query({ feature: 'feat-a' })
    expect(results).toHaveLength(2)
    expect(results.every(e => e.feature === 'feat-a')).toBe(true)
  })

  it('filters by model', async () => {
    const store = await buildStore()
    const results = await store.query({ model: 'gpt-4o-mini' })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('2')
  })

  it('filters by provider', async () => {
    const store = await buildStore()
    const results = await store.query({ provider: 'openai' })
    expect(results).toHaveLength(2)
  })

  it('filters by userId', async () => {
    const store = await buildStore()
    const results = await store.query({ userId: 'u2' })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('2')
  })

  it('filters by startDate (inclusive)', async () => {
    const store = makeStore()
    const past = new Date('2024-01-01T00:00:00Z')
    const future = new Date('2099-01-01T00:00:00Z')
    const base: AICostEvent = {
      id: 'x',
      timestamp: past,
      model: 'm',
      provider: 'other',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUSD: 0,
      feature: 'f',
      success: true,
      durationMs: 0,
    }
    await store.save({ ...base, id: 'old', timestamp: past })
    await store.save({ ...base, id: 'new', timestamp: future })

    const results = await store.query({ startDate: new Date('2050-01-01T00:00:00Z') })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('new')
  })

  it('filters by endDate (inclusive)', async () => {
    const store = makeStore()
    const past = new Date('2024-01-01T00:00:00Z')
    const future = new Date('2099-01-01T00:00:00Z')
    const base: AICostEvent = {
      id: 'x',
      timestamp: past,
      model: 'm',
      provider: 'other',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUSD: 0,
      feature: 'f',
      success: true,
      durationMs: 0,
    }
    await store.save({ ...base, id: 'old', timestamp: past })
    await store.save({ ...base, id: 'new', timestamp: future })

    const results = await store.query({ endDate: new Date('2050-01-01T00:00:00Z') })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('old')
  })
})

// ---------------------------------------------------------------------------
// InMemoryCostStore.aggregate — daily grouping
// ---------------------------------------------------------------------------

describe('InMemoryCostStore.aggregate', () => {
  it('groups by daily period', async () => {
    const store = makeStore()
    const day1 = new Date('2025-01-01T10:00:00Z')
    const day2 = new Date('2025-01-02T10:00:00Z')
    const base: Omit<AICostEvent, 'id' | 'timestamp'> = {
      model: 'm',
      provider: 'other',
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costUSD: 1,
      feature: 'f',
      success: true,
      durationMs: 100,
    }
    await store.save({ ...base, id: '1', timestamp: day1 })
    await store.save({ ...base, id: '2', timestamp: day1 })
    await store.save({ ...base, id: '3', timestamp: day2 })

    const summaries = await store.aggregate('daily')
    expect(summaries).toHaveLength(2)

    const d1 = summaries.find(s => s.date === '2025-01-01')!
    expect(d1.requestCount).toBe(2)
    expect(d1.totalCost).toBeCloseTo(2, 6)
    expect(d1.successCount).toBe(2)
    expect(d1.errorCount).toBe(0)
    expect(d1.totalTokens).toBe(30)

    const d2 = summaries.find(s => s.date === '2025-01-02')!
    expect(d2.requestCount).toBe(1)
  })

  it('counts error events correctly', async () => {
    const store = makeStore()
    const ts = new Date('2025-03-01T00:00:00Z')
    await store.save({
      id: '1', timestamp: ts, model: 'm', provider: 'other',
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costUSD: 0, feature: 'f', success: false, durationMs: 50,
    })
    await store.save({
      id: '2', timestamp: ts, model: 'm', provider: 'other',
      promptTokens: 10, completionTokens: 5, totalTokens: 15,
      costUSD: 1, feature: 'f', success: true, durationMs: 150,
    })

    const [summary] = await store.aggregate('daily')
    expect(summary.successCount).toBe(1)
    expect(summary.errorCount).toBe(1)
    expect(summary.avgDurationMs).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// InMemoryCostStore.getFeatureCosts
// ---------------------------------------------------------------------------

describe('InMemoryCostStore.getFeatureCosts', () => {
  it('groups events by feature', async () => {
    const store = makeStore()
    const ts = new Date()
    const base: Omit<AICostEvent, 'id' | 'feature'> = {
      timestamp: ts,
      model: 'm',
      provider: 'other',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      costUSD: 1,
      success: true,
      durationMs: 100,
    }
    await store.save({ ...base, id: '1', feature: 'feat-x' })
    await store.save({ ...base, id: '2', feature: 'feat-x', costUSD: 2 })
    await store.save({ ...base, id: '3', feature: 'feat-y', costUSD: 3 })

    const featureCosts = await store.getFeatureCosts()
    expect(featureCosts).toHaveLength(2)

    const fx = featureCosts.find(f => f.feature === 'feat-x')!
    expect(fx.callCount).toBe(2)
    expect(fx.totalCost).toBeCloseTo(3, 6)
    expect(fx.avgCostPerCall).toBeCloseTo(1.5, 6)
    expect(fx.totalTokens).toBe(300)
    expect(fx.successRate).toBe(1)

    const fy = featureCosts.find(f => f.feature === 'feat-y')!
    expect(fy.callCount).toBe(1)
    expect(fy.totalCost).toBeCloseTo(3, 6)
  })

  it('calculates successRate correctly with mixed outcomes', async () => {
    const store = makeStore()
    const ts = new Date()
    const base: Omit<AICostEvent, 'id' | 'success'> = {
      timestamp: ts, model: 'm', provider: 'other',
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costUSD: 0, feature: 'f', durationMs: 1,
    }
    await store.save({ ...base, id: '1', success: true })
    await store.save({ ...base, id: '2', success: true })
    await store.save({ ...base, id: '3', success: false })

    const [fc] = await store.getFeatureCosts()
    expect(fc.successRate).toBeCloseTo(2 / 3, 6)
  })

  it('tracks lastUsed as the most recent timestamp', async () => {
    const store = makeStore()
    const earlier = new Date('2025-01-01T00:00:00Z')
    const later = new Date('2025-06-01T00:00:00Z')
    const base: Omit<AICostEvent, 'id' | 'timestamp'> = {
      model: 'm', provider: 'other',
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costUSD: 0, feature: 'f', success: true, durationMs: 1,
    }
    await store.save({ ...base, id: '1', timestamp: earlier })
    await store.save({ ...base, id: '2', timestamp: later })

    const [fc] = await store.getFeatureCosts()
    expect(fc.lastUsed).toEqual(later)
  })
})

// ---------------------------------------------------------------------------
// InMemoryCostStore capacity — evicts when over 10K events
// ---------------------------------------------------------------------------

describe('InMemoryCostStore capacity', () => {
  it('evicts oldest event when 10K limit is reached', async () => {
    const store = makeStore()
    const base: Omit<AICostEvent, 'id'> = {
      timestamp: new Date(),
      model: 'm',
      provider: 'other',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUSD: 0,
      feature: 'f',
      success: true,
      durationMs: 1,
    }

    // Fill to capacity
    for (let i = 0; i < 10_000; i++) {
      await store.save({ ...base, id: `ev_${i}` })
    }

    // Verify the first event still exists before overflow
    let all = await store.query({})
    expect(all[0].id).toBe('ev_0')
    expect(all).toHaveLength(10_000)

    // Push one more — should evict ev_0
    await store.save({ ...base, id: 'ev_10000' })

    all = await store.query({})
    expect(all).toHaveLength(10_000)
    expect(all[0].id).toBe('ev_1')
    expect(all[all.length - 1].id).toBe('ev_10000')
  }, 15_000)
})

// ---------------------------------------------------------------------------
// parseBudgetFromEnv
// ---------------------------------------------------------------------------

describe('parseBudgetFromEnv (via getCostTracker)', () => {
  // parseBudgetFromEnv is not exported. Its behaviour surfaces through
  // getCostTracker() which calls it lazily on first use.
  // We test it by resetting the module registry so each sub-test gets a
  // fresh singleton, then setting process.env before the import.

  it('getCostTracker returns a tracker instance', async () => {
    vi.resetModules()
    // After resetModules, the freshly re-imported AICostTracker is a different
    // class reference than the top-level import. Check duck-type instead.
    const { getCostTracker: fresh, AICostTracker: FreshClass } = await import('./tracker')
    expect(fresh()).toBeInstanceOf(FreshClass)
    vi.resetModules()
  })

  it('parseBudgetFromEnv throws on invalid budget', async () => {
    const original = process.env.AI_DAILY_BUDGET
    process.env.AI_DAILY_BUDGET = 'not-a-number'
    try {
      vi.resetModules()
      const { getCostTracker: fresh } = await import('./tracker')
      expect(() => fresh()).toThrow(/Invalid AI_DAILY_BUDGET/)
    } finally {
      if (original === undefined) {
        delete process.env.AI_DAILY_BUDGET
      } else {
        process.env.AI_DAILY_BUDGET = original
      }
      vi.resetModules()
    }
  })

  it('parseBudgetFromEnv treats 0 as a valid non-negative budget value', async () => {
    // Note: the tracker implementation uses `!this.dailyBudget` which is truthy for 0,
    // meaning dailyBudget=0 behaves the same as "no budget" (returns Infinity from checkBudget).
    // This test documents that parseBudgetFromEnv itself does NOT throw for "0" — the value
    // is accepted (no error), even if the falsy guard means it won't enforce a zero ceiling.
    const original = process.env.AI_DAILY_BUDGET
    process.env.AI_DAILY_BUDGET = '0'
    try {
      vi.resetModules()
      // If parseBudgetFromEnv rejected "0" it would throw here
      const { getCostTracker: fresh } = await import('./tracker')
      expect(() => fresh()).not.toThrow()
    } finally {
      if (original === undefined) {
        delete process.env.AI_DAILY_BUDGET
      } else {
        process.env.AI_DAILY_BUDGET = original
      }
      vi.resetModules()
    }
  })

  it('parseBudgetFromEnv is a no-op when env var is unset', async () => {
    const original = process.env.AI_DAILY_BUDGET
    delete process.env.AI_DAILY_BUDGET
    try {
      vi.resetModules()
      const { getCostTracker: fresh } = await import('./tracker')
      const status = await fresh().checkBudget()
      expect(status.budget).toBe(Infinity) // no budget set
    } finally {
      if (original !== undefined) {
        process.env.AI_DAILY_BUDGET = original
      }
      vi.resetModules()
    }
  })
})

// ---------------------------------------------------------------------------
// calculateCost — known and unknown models
// ---------------------------------------------------------------------------

describe('calculateCost', () => {
  it('calculates cost correctly for claude-3-5-haiku', () => {
    // input: 0.0008/1K, output: 0.004/1K
    const { costUSD, provider } = calculateCost('claude-3-5-haiku-20241022', 1000, 500)
    expect(provider).toBe('anthropic')
    expect(costUSD).toBeCloseTo(0.0008 + 0.002, 8)
  })

  it('calculates cost correctly for claude-sonnet-4-20250514', () => {
    // input: 0.003/1K, output: 0.015/1K
    const { costUSD, provider } = calculateCost('claude-sonnet-4-20250514', 2000, 1000)
    expect(provider).toBe('anthropic')
    expect(costUSD).toBeCloseTo(0.006 + 0.015, 8)
  })

  it('calculates cost correctly for gpt-4o', () => {
    // input: 0.0025/1K, output: 0.01/1K
    const { costUSD, provider } = calculateCost('gpt-4o', 1000, 1000)
    expect(provider).toBe('openai')
    expect(costUSD).toBeCloseTo(0.0025 + 0.01, 8)
  })

  it('calculates cost correctly for gpt-4o-mini', () => {
    // input: 0.00015/1K, output: 0.0006/1K
    const { costUSD, provider } = calculateCost('gpt-4o-mini', 1000, 1000)
    expect(provider).toBe('openai')
    expect(costUSD).toBeCloseTo(0.00015 + 0.0006, 8)
  })

  it('uses flat rate fallback for unknown models', () => {
    const { costUSD, provider } = calculateCost('some-unknown-model', 2000, 1000)
    expect(provider).toBe('other')
    // (2000 + 1000) / 1000 * 0.01 = 0.03
    expect(costUSD).toBeCloseTo(0.03, 8)
  })

  it('returns 0 cost for zero tokens on an unknown model', () => {
    const { costUSD } = calculateCost('unknown-model', 0, 0)
    expect(costUSD).toBe(0)
  })

  it('throws for negative token counts', () => {
    expect(() => calculateCost('gpt-4o', -1, 0)).toThrow('Token counts must be non-negative')
    expect(() => calculateCost('gpt-4o', 0, -1)).toThrow('Token counts must be non-negative')
  })
})
