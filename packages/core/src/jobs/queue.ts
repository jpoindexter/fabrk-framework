/**
 * Job Queue
 *
 * Simple async job queue for background processing.
 * Supports priorities, retries, delays, and scheduling.
 *
 * @example
 * ```ts
 * const queue = createJobQueue()
 *
 * // Register a handler
 * queue.process('send-email', async (job) => {
 *   await sendEmail(job.payload.to, job.payload.subject)
 * })
 *
 * // Enqueue a job
 * await queue.enqueue({
 *   type: 'send-email',
 *   payload: { to: 'user@example.com', subject: 'Hello' },
 *   maxRetries: 3,
 * })
 *
 * // Start processing
 * queue.start()
 * ```
 */

import type { Job, JobOptions, JobStatus, JobStore } from '../plugin-types'

const ALLOWED_JOB_UPDATE_FIELDS = ['status', 'lastAttemptAt', 'attempts', 'completedAt', 'error', 'result'] as const

export interface JobQueue {
  /** Enqueue a job */
  enqueue(options: JobOptions): Promise<Job>
  /** Register a job handler */
  process(type: string, handler: (job: Job) => Promise<void>): void
  /** Start processing jobs */
  start(options?: { pollInterval?: number }): void
  /** Stop processing jobs */
  stop(): void
  /** Get a job by ID */
  getJob(id: string): Promise<Job | null>
  /** Get jobs by status */
  getByStatus(status: JobStatus, limit?: number): Promise<Job[]>
}

/**
 * In-memory job store
 */
class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, Job>()
  /** Tracks jobs that have been dequeued but not yet completed/failed, preventing double-dispatch. */
  private inFlight = new Set<string>()

  async enqueue(job: Job) {
    this.jobs.set(job.id, job)
  }

  async dequeue(types?: string[]) {
    const now = new Date()
    const pending = Array.from(this.jobs.values())
      .filter((j) => j.status === 'pending')
      .filter((j) => !this.inFlight.has(j.id))
      .filter((j) => !types?.length || types.includes(j.type))
      .filter((j) => !j.scheduledAt || j.scheduledAt <= now)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    const job = pending[0] ?? null
    if (job) this.inFlight.add(job.id)
    return job
  }

  async update(id: string, updates: Partial<Job>) {
    const job = this.jobs.get(id)
    if (job) {
      for (const key of ALLOWED_JOB_UPDATE_FIELDS) {
        if (key in updates) {
          ;(job as unknown as Record<string, unknown>)[key] = (updates as unknown as Record<string, unknown>)[key]
        }
      }
      const terminalStatuses: Array<Job['status']> = ['completed', 'failed', 'pending']
      if (updates.status && terminalStatuses.includes(updates.status)) {
        this.inFlight.delete(id)
      }
    }
  }

  async getById(id: string) {
    return this.jobs.get(id) ?? null
  }

  async getByStatus(status: JobStatus, limit = 100) {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === status)
      .slice(0, limit)
  }
}

export function createJobQueue(store?: JobStore): JobQueue {
  const jobStore = store ?? new InMemoryJobStore()
  const handlers = new Map<string, (job: Job) => Promise<void>>()
  let running = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pollTimer: any = null

  async function processNext(): Promise<boolean> {
    const types = Array.from(handlers.keys())
    if (!types.length) return false

    const job = await jobStore.dequeue(types)
    if (!job) return false

    const handler = handlers.get(job.type)
    if (!handler) return false

    const nextAttempts = job.attempts + 1
    try {
      await jobStore.update(job.id, {
        status: 'running',
        lastAttemptAt: new Date(),
        attempts: nextAttempts,
      })
    } catch {
      // Reset to pending so inFlight is cleared and job can be retried
      await jobStore.update(job.id, { status: 'pending' }).catch(() => {})
      return false
    }

    try {
      await handler(job)
      await jobStore.update(job.id, {
        status: 'completed',
        completedAt: new Date(),
      })
    } catch (err) {
      const maxRetries = job.maxRetries ?? 3
      const newStatus: JobStatus = nextAttempts >= maxRetries ? 'failed' : 'pending'

      await jobStore.update(job.id, {
        status: newStatus,
        error: err instanceof Error ? err.message : 'Job failed',
      })
    }

    return true
  }

  return {
    async enqueue(options: JobOptions): Promise<Job> {
      const job: Job = {
        ...options,
        id: crypto.randomUUID(),
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        priority: options.priority ?? 0,
        maxRetries: options.maxRetries ?? 3,
      }

      // Apply delay
      if (options.delay) {
        job.scheduledAt = new Date(Date.now() + options.delay)
      }

      await jobStore.enqueue(job)
      return job
    },

    process(type: string, handler: (job: Job) => Promise<void>) {
      handlers.set(type, handler)
    },

    start(options?: { pollInterval?: number }) {
      if (running) return
      running = true

      const interval = options?.pollInterval ?? 1000

      pollTimer = setInterval(async () => {
        if (!running) return
        try {
          await processNext()
        } catch {
          // Ignore processing errors
        }
      }, interval)

      // Prevent interval from keeping process alive
      if (pollTimer && typeof pollTimer.unref === 'function') {
        pollTimer.unref()
      }
    },

    stop() {
      running = false
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    },

    async getJob(id: string) {
      return jobStore.getById(id)
    },

    async getByStatus(status: JobStatus, limit?: number) {
      return jobStore.getByStatus(status, limit)
    },
  }
}
