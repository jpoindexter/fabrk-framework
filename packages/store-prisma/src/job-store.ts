/**
 * Prisma-based Job Store
 *
 * Persists background jobs to the database for durable processing.
 */

import type { JobStore, Job, JobStatus } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaJobStore implements JobStore {
  constructor(private prisma: PrismaClient) {}

  async enqueue(job: Job): Promise<void> {
    await this.prisma.job.create({
      data: {
        id: job.id,
        type: job.type,
        payload: job.payload,
        priority: job.priority ?? 0,
        maxRetries: job.maxRetries ?? 3,
        delay: job.delay,
        scheduledAt: job.scheduledAt,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt,
      },
    })
  }

  async dequeue(types?: string[]): Promise<Job | null> {
    // Atomically claim next available job using updateMany + findFirst pattern
    const now = new Date()

    const where: Record<string, unknown> = {
      status: 'pending',
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: now } },
      ],
    }
    if (types?.length) {
      where.type = { in: types }
    }

    // Find and claim in a transaction
    const job = await this.prisma.$transaction(async (tx: PrismaClient) => {
      const pending = await tx.job.findFirst({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
      })

      if (!pending) return null

      await tx.job.update({
        where: { id: pending.id },
        data: {
          status: 'running',
          lastAttemptAt: now,
          attempts: { increment: 1 },
        },
      })

      return { ...pending, status: 'running' as const, lastAttemptAt: now, attempts: pending.attempts + 1 }
    })

    return job ? mapJob(job) : null
  }

  async update(id: string, updates: Partial<Job>): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: {
        status: updates.status,
        attempts: updates.attempts,
        lastAttemptAt: updates.lastAttemptAt,
        completedAt: updates.completedAt,
        error: updates.error,
        result: updates.result as Record<string, unknown> | undefined,
      },
    })
  }

  async getById(id: string): Promise<Job | null> {
    const job = await this.prisma.job.findUnique({ where: { id } })
    return job ? mapJob(job) : null
  }

  async getByStatus(status: JobStatus, limit?: number): Promise<Job[]> {
    const jobs = await this.prisma.job.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jobs.map((j: any) => mapJob(j))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJob(raw: any): Job {
  return {
    id: raw.id,
    type: raw.type,
    payload: raw.payload ?? {},
    priority: raw.priority ?? 0,
    maxRetries: raw.maxRetries ?? 3,
    delay: raw.delay ?? undefined,
    scheduledAt: raw.scheduledAt ?? undefined,
    status: raw.status as JobStatus,
    attempts: raw.attempts,
    createdAt: raw.createdAt,
    lastAttemptAt: raw.lastAttemptAt ?? undefined,
    completedAt: raw.completedAt ?? undefined,
    error: raw.error ?? undefined,
    result: raw.result ?? undefined,
  }
}
