/**
 * Prisma-based Cost Store Implementation
 *
 * Persists AI cost events to the database for long-term tracking.
 * Use this in production instead of the in-memory store.
 *
 * @example
 * import { PrismaCostStore } from '@/lib/ai/cost-store-prisma'
 * import { AICostTracker, setCostStore } from '@/lib/ai/cost'
 *
 * // At app startup:
 * setCostStore(new PrismaCostStore())
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type {
  AICostEvent,
  CostStore,
  CostSummary,
  FeatureCost,
} from './cost';

export class PrismaCostStore implements CostStore {
  async save(event: AICostEvent): Promise<void> {
    await prisma.aICostEvent.create({
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
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
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
    const events = await prisma.aICostEvent.findMany({
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

    return events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      model: e.model,
      provider: e.provider as AICostEvent['provider'],
      promptTokens: e.promptTokens,
      completionTokens: e.completionTokens,
      totalTokens: e.totalTokens,
      costUSD: e.costUSD,
      feature: e.feature,
      prompt: e.prompt ?? undefined,
      success: e.success,
      errorMessage: e.errorMessage ?? undefined,
      durationMs: e.durationMs,
      userId: e.userId ?? undefined,
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
    // Use raw query for date truncation
    const truncFn = this.getDateTruncFn(period);

    const results = await prisma.$queryRaw<
      Array<{
        date: Date;
        total_cost: number;
        total_tokens: bigint;
        request_count: bigint;
        success_count: bigint;
        error_count: bigint;
        avg_duration_ms: number;
      }>
    >`
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

    return results.map((r) => ({
      date: r.date.toISOString().split('T')[0],
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
    const results = await prisma.$queryRaw<
      Array<{
        feature: string;
        total_cost: number;
        call_count: bigint;
        total_tokens: bigint;
        success_count: bigint;
        last_used: Date;
      }>
    >`
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

    return results.map((r) => {
      const callCount = Number(r.call_count);
      const totalCost = Number(r.total_cost);
      const successCount = Number(r.success_count);

      return {
        feature: r.feature,
        totalCost,
        callCount,
        avgCostPerCall: callCount > 0 ? totalCost / callCount : 0,
        totalTokens: Number(r.total_tokens),
        successRate: callCount > 0 ? successCount / callCount : 0,
        lastUsed: r.last_used,
      };
    });
  }

  private getDateTruncFn(period: 'daily' | 'weekly' | 'monthly'): string {
    switch (period) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
    }
  }
}

/**
 * Initialize cost tracking with Prisma store
 * Call this at app startup
 */
export function initializeCostTracking(): void {
  // Dynamic import to avoid circular dependencies
  import('./cost').then(({ setCostStore }) => {
    setCostStore(new PrismaCostStore());
  });
}
