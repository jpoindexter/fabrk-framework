import type { JobStore, Job, JobStatus } from '@fabrk/core'
import type { PrismaClient } from './types'

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
    const now = new Date()

    // Use $queryRaw with tagged template literals (Prisma's safe SQL API).
    // When types are provided they are passed as parameters via the IN list;
    // we build separate positional slots so no value is ever string-interpolated.
    let rows: Record<string, unknown>[]
    if (types?.length) {
      // Build a safe parameterized query using Prisma's $queryRaw tagged-template
      // calling convention without importing @prisma/client. $queryRaw accepts the
      // same (TemplateStringsArray, ...values) signature used by tagged templates.
      // We construct the parts array manually so that every value — including each
      // type string — is passed as a bound parameter, never string-interpolated.
      //
      // For N interpolated values you need exactly N+1 string parts.
      // Values passed: now (x2), ...types  →  2 + types.length values
      //   → need 3 + types.length string parts
      //
      // Parts layout:
      //   parts[0]              : SQL before first `now`
      //   parts[1]              : SQL between first and second `now`
      //   parts[2]              : SQL between second `now` and types[0]
      //   parts[3..N]           : ', ' between each pair of type values
      //   parts[2+types.length] : SQL closing the IN list and the rest of the query
      const prefix = `UPDATE "Job"
         SET "status" = 'running',
             "lastAttemptAt" = `
      const middle1 = `,
             "attempts" = "attempts" + 1
         WHERE "id" = (
           SELECT "id" FROM "Job"
           WHERE "status" = 'pending'
             AND ("scheduledAt" IS NULL OR "scheduledAt" <= `
      const middle2 = `)
             AND "type" IN (`
      const suffix = `)
           ORDER BY "priority" DESC, "createdAt" ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`
      // Separators between type values: N-1 ', ' parts, then the suffix as the last part
      const innerSeparators = types.slice(0, -1).map(() => ', ')
      const rawParts: string[] = [prefix, middle1, middle2, ...innerSeparators, suffix]
      const templateObj = Object.assign(rawParts, { raw: rawParts }) as TemplateStringsArray
      rows = await this.prisma.$queryRaw(templateObj, now, now, ...types)
    } else {
      rows = await this.prisma.$queryRaw`
        UPDATE "Job"
        SET "status" = 'running',
            "lastAttemptAt" = ${now},
            "attempts" = "attempts" + 1
        WHERE "id" = (
          SELECT "id" FROM "Job"
          WHERE "status" = 'pending'
            AND ("scheduledAt" IS NULL OR "scheduledAt" <= ${now})
          ORDER BY "priority" DESC, "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *`
    }

    if (!rows || rows.length === 0) return null
    return mapJob(rows[0])
  }

  /** @security No tenant isolation — caller must verify the job belongs to the requesting user/org. */
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
      take: limit ?? 100,
    })
    return jobs.map((j: Record<string, unknown>) => mapJob(j))
  }
}

/**
 * Normalize a raw DB row to camelCase field names.
 * `$queryRaw` returns snake_case column names from PostgreSQL; ORM calls
 * return camelCase. This mapper handles both so `mapJob` works for both
 * code paths.
 */
function normalizeJobRow(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    id: raw.id,
    type: raw.type,
    payload: raw.payload,
    priority: raw.priority,
    maxRetries: raw.maxRetries ?? raw.max_retries,
    delay: raw.delay,
    scheduledAt: raw.scheduledAt ?? raw.scheduled_at,
    status: raw.status,
    attempts: raw.attempts,
    createdAt: raw.createdAt ?? raw.created_at,
    lastAttemptAt: raw.lastAttemptAt ?? raw.last_attempt_at,
    completedAt: raw.completedAt ?? raw.completed_at,
    error: raw.error,
    result: raw.result,
  }
}

function mapJob(raw: Record<string, unknown>): Job {
  const r = normalizeJobRow(raw)
  return {
    id: r.id as string,
    type: r.type as string,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    priority: (r.priority as number | undefined) ?? 0,
    maxRetries: (r.maxRetries as number | undefined) ?? 3,
    delay: (r.delay as number | undefined) ?? undefined,
    scheduledAt: (r.scheduledAt as Date | undefined) ?? undefined,
    status: r.status as JobStatus,
    attempts: r.attempts as number,
    createdAt: r.createdAt as Date,
    lastAttemptAt: (r.lastAttemptAt as Date | undefined) ?? undefined,
    completedAt: (r.completedAt as Date | undefined) ?? undefined,
    error: (r.error as string | undefined) ?? undefined,
    result: (r.result as Record<string, unknown> | undefined) ?? undefined,
  }
}
