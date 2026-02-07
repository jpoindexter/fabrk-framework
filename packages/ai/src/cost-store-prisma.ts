/**
 * Prisma-based Cost Store Implementation
 *
 * Persists AI cost events to the database for long-term tracking.
 * Use this in production instead of the in-memory store.
 *
 * This is a reference implementation. Users must provide their own
 * Prisma client instance since @fabrk/ai does not depend on Prisma.
 *
 * @example
 * ```ts
 * import { PrismaCostStore } from '@fabrk/ai'
 * import { setCostStore } from '@fabrk/ai'
 * import { prisma } from './lib/prisma' // Your Prisma instance
 *
 * // At app startup:
 * setCostStore(new PrismaCostStore(prisma))
 * ```
 */

import type {
  AICostEvent,
  CostStore,
  CostSummary,
  FeatureCost,
} from './cost';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any;

export class PrismaCostStore implements CostStore {
  constructor(private prisma: PrismaClient) {}

  async save(event: AICostEvent): Promise<void> {
    await this.prisma.aICostEvent.create({
      data: {
        id: event.id,
        timestamp: event.timestamp,
        model: event.model,
        provider: event.provider,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        costUSD: event.costUSD,
        feature: event.feature,
        prompt: event.prompt,
        success: event.success,
        errorMessage: event.errorMessage,
        durationMs: event.durationMs,
        userId: event.userId,
        metadata: event.metadata,
      },
    });
  }

  async query(filters: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    model?: string;
    provider?: string;
  }): Promise<AICostEvent[]> {
    const events = await this.prisma.aICostEvent.findMany({
      where: {
        feature: filters.feature,
        model: filters.model,
        provider: filters.provider,
        userId: filters.userId,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return events.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      timestamp: e.timestamp as Date,
      model: e.model as string,
      provider: e.provider as AICostEvent['provider'],
      promptTokens: e.promptTokens as number,
      completionTokens: e.completionTokens as number,
      totalTokens: e.totalTokens as number,
      costUSD: e.costUSD as number,
      feature: e.feature as string,
      prompt: (e.prompt as string) ?? undefined,
      success: e.success as boolean,
      errorMessage: (e.errorMessage as string) ?? undefined,
      durationMs: e.durationMs as number,
      userId: (e.userId as string) ?? undefined,
      metadata: e.metadata as Record<string, unknown> | undefined,
    }));
  }

  async aggregate(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    }
  ): Promise<CostSummary[]> {
    const truncFn = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';

    const results = await this.prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${truncFn}, timestamp) as date,
        SUM("costUSD") as total_cost,
        SUM("totalTokens") as total_tokens,
        COUNT(*) as request_count,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count,
        AVG("durationMs") as avg_duration_ms
      FROM "AICostEvent"
      WHERE
        (${filters?.startDate ?? null}::timestamp IS NULL OR timestamp >= ${filters?.startDate ?? null})
        AND (${filters?.endDate ?? null}::timestamp IS NULL OR timestamp <= ${filters?.endDate ?? null})
        AND (${filters?.userId ?? null}::text IS NULL OR "userId" = ${filters?.userId ?? null})
      GROUP BY DATE_TRUNC(${truncFn}, timestamp)
      ORDER BY date DESC
    `;

    return (results as Array<Record<string, unknown>>).map((r) => ({
      date: (r.date as Date).toISOString().split('T')[0],
      totalCost: Number(r.total_cost),
      totalTokens: Number(r.total_tokens),
      requestCount: Number(r.request_count),
      successCount: Number(r.success_count),
      errorCount: Number(r.error_count),
      avgDurationMs: Number(r.avg_duration_ms),
    }));
  }

  async getFeatureCosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<FeatureCost[]> {
    const results = await this.prisma.$queryRaw`
      SELECT
        feature,
        SUM("costUSD") as total_cost,
        COUNT(*) as call_count,
        SUM("totalTokens") as total_tokens,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
        MAX(timestamp) as last_used
      FROM "AICostEvent"
      WHERE
        (${filters?.startDate ?? null}::timestamp IS NULL OR timestamp >= ${filters?.startDate ?? null})
        AND (${filters?.endDate ?? null}::timestamp IS NULL OR timestamp <= ${filters?.endDate ?? null})
        AND (${filters?.userId ?? null}::text IS NULL OR "userId" = ${filters?.userId ?? null})
      GROUP BY feature
      ORDER BY total_cost DESC
    `;

    return (results as Array<Record<string, unknown>>).map((r) => {
      const callCount = Number(r.call_count);
      const totalCost = Number(r.total_cost);
      const successCount = Number(r.success_count);

      return {
        feature: r.feature as string,
        totalCost,
        callCount,
        avgCostPerCall: callCount > 0 ? totalCost / callCount : 0,
        totalTokens: Number(r.total_tokens),
        successRate: callCount > 0 ? successCount / callCount : 0,
        lastUsed: r.last_used as Date,
      };
    });
  }
}
