 
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createJobQueue } from './queue'

describe('JobQueue', () => {
  let queue: ReturnType<typeof createJobQueue>

  afterEach(() => {
    queue?.stop()
  })

  it('should enqueue a job', async () => {
    queue = createJobQueue()
    const job = await queue.enqueue({
      type: 'send-email',
      payload: { to: 'user@test.com' },
    })

    expect(job.id).toBeDefined()
    expect(job.status).toBe('pending')
    expect(job.type).toBe('send-email')
    expect(job.attempts).toBe(0)
    expect(job.priority).toBe(0)
    expect(job.maxRetries).toBe(3)
  })

  it('should apply delay as scheduledAt', async () => {
    queue = createJobQueue()
    const before = Date.now()

    const job = await queue.enqueue({
      type: 'delayed',
      payload: {},
      delay: 5000,
    })

    expect(job.scheduledAt).toBeDefined()
    expect(job.scheduledAt!.getTime()).toBeGreaterThanOrEqual(before + 5000)
  })

  it('should get a job by ID', async () => {
    queue = createJobQueue()
    const job = await queue.enqueue({
      type: 'test',
      payload: { data: 123 },
    })

    const fetched = await queue.getJob(job.id)
    expect(fetched).toBeDefined()
    expect(fetched!.id).toBe(job.id)
    expect(fetched!.payload).toEqual({ data: 123 })
  })

  it('should return null for nonexistent job', async () => {
    queue = createJobQueue()
    const result = await queue.getJob('nonexistent')
    expect(result).toBeNull()
  })

  it('should get jobs by status', async () => {
    queue = createJobQueue()
    await queue.enqueue({ type: 'a', payload: {} })
    await queue.enqueue({ type: 'b', payload: {} })

    const pending = await queue.getByStatus('pending')
    expect(pending).toHaveLength(2)
  })

  it('should register and invoke handlers', async () => {
    queue = createJobQueue()
    const handler = vi.fn()

    queue.process('test-job', handler)

    await queue.enqueue({
      type: 'test-job',
      payload: { msg: 'hello' },
    })

    // Start with fast polling
    queue.start({ pollInterval: 50 })

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should mark jobs as completed after successful processing', async () => {
    queue = createJobQueue()

    queue.process('simple', async () => {
      // success
    })

    const job = await queue.enqueue({ type: 'simple', payload: {} })
    queue.start({ pollInterval: 50 })

    await new Promise((resolve) => setTimeout(resolve, 200))

    const completed = await queue.getJob(job.id)
    expect(completed!.status).toBe('completed')
    expect(completed!.completedAt).toBeDefined()
  })

  it('should retry failed jobs', async () => {
    queue = createJobQueue()
    let callCount = 0

    queue.process('flaky', async () => {
      callCount++
      if (callCount < 3) throw new Error('Temporary failure')
    })

    const job = await queue.enqueue({
      type: 'flaky',
      payload: {},
      maxRetries: 5,
    })

    queue.start({ pollInterval: 50 })

    await new Promise((resolve) => setTimeout(resolve, 500))

    const result = await queue.getJob(job.id)
    expect(result!.status).toBe('completed')
    expect(callCount).toBeGreaterThanOrEqual(3)
  })

  it('should mark as failed when max retries exhausted', async () => {
    queue = createJobQueue()

    queue.process('always-fail', async () => {
      throw new Error('Always fails')
    })

    const job = await queue.enqueue({
      type: 'always-fail',
      payload: {},
      maxRetries: 1,
    })

    queue.start({ pollInterval: 50 })

    await new Promise((resolve) => setTimeout(resolve, 200))

    const result = await queue.getJob(job.id)
    expect(result!.status).toBe('failed')
    expect(result!.error).toBe('Always fails')
  })

  it('should respect priority ordering', async () => {
    queue = createJobQueue()
    const processed: string[] = []

    queue.process('ordered', async (job) => {
      processed.push(job.payload.name as string)
    })

    await queue.enqueue({ type: 'ordered', payload: { name: 'low' }, priority: 1 })
    await queue.enqueue({ type: 'ordered', payload: { name: 'high' }, priority: 10 })
    await queue.enqueue({ type: 'ordered', payload: { name: 'medium' }, priority: 5 })

    queue.start({ pollInterval: 50 })

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(processed[0]).toBe('high')
  })

  it('should not start twice', () => {
    queue = createJobQueue()
    queue.process('test', async () => {})
    queue.start({ pollInterval: 1000 })
    // Calling start again should be a no-op
    queue.start({ pollInterval: 1000 })
  })
})
