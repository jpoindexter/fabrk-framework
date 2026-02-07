import { describe, it, expect, vi } from 'vitest'
import { createMiddleware, compose } from './middleware'

describe('createMiddleware', () => {
  it('should execute middleware in order', async () => {
    const order: number[] = []

    const chain = createMiddleware<{ value: number }>()
      .use(async (_ctx, next) => {
        order.push(1)
        await next()
        order.push(4)
      })
      .use(async (_ctx, next) => {
        order.push(2)
        await next()
        order.push(3)
      })

    await chain.run({ value: 0 })

    expect(order).toEqual([1, 2, 3, 4])
  })

  it('should pass context through middleware', async () => {
    const chain = createMiddleware<{ count: number }>()
      .use(async (ctx, next) => {
        ctx.count += 1
        await next()
      })
      .use(async (ctx, next) => {
        ctx.count += 10
        await next()
      })

    const ctx = { count: 0 }
    await chain.run(ctx)

    expect(ctx.count).toBe(11)
  })

  it('should stop chain when next is not called', async () => {
    const secondMiddleware = vi.fn()

    const chain = createMiddleware()
      .use(async (_ctx, _next) => {
        // Intentionally not calling next
      })
      .use(secondMiddleware)

    await chain.run({})

    expect(secondMiddleware).not.toHaveBeenCalled()
  })

  it('should handle empty middleware chain', async () => {
    const chain = createMiddleware()
    // Should not throw
    await chain.run({})
  })

  it('should propagate errors', async () => {
    const chain = createMiddleware()
      .use(async (_ctx, next) => {
        await next()
      })
      .use(async () => {
        throw new Error('Test error')
      })

    await expect(chain.run({})).rejects.toThrow('Test error')
  })
})

describe('compose', () => {
  it('should compose multiple middleware into one', async () => {
    const order: number[] = []

    const m1 = async (_ctx: unknown, next: () => Promise<void>) => {
      order.push(1)
      await next()
    }
    const m2 = async (_ctx: unknown, next: () => Promise<void>) => {
      order.push(2)
      await next()
    }

    const composed = compose(m1, m2)
    const finalNext = vi.fn(async () => { order.push(3) })

    await composed({}, finalNext)

    expect(order).toEqual([1, 2, 3])
    expect(finalNext).toHaveBeenCalled()
  })

  it('should call final next when no middleware', async () => {
    const composed = compose()
    const finalNext = vi.fn()

    await composed({}, finalNext)

    expect(finalNext).toHaveBeenCalled()
  })
})
