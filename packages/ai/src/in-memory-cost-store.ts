import type { AICostEvent, CostSummary, FeatureCost, CostStore } from './cost-types';

export class InMemoryCostStore implements CostStore {
  private static readonly MAX_EVENTS = 10_000;
  private buffer: (AICostEvent | undefined)[] = new Array(InMemoryCostStore.MAX_EVENTS);
  private head = 0;
  private count = 0;

  async save(event: AICostEvent): Promise<void> {
    const idx = (this.head + this.count) % InMemoryCostStore.MAX_EVENTS;
    this.buffer[idx] = event;
    if (this.count < InMemoryCostStore.MAX_EVENTS) {
      this.count++;
    } else {
      this.head = (this.head + 1) % InMemoryCostStore.MAX_EVENTS;
    }
  }

  private getEvents(): AICostEvent[] {
    const result: AICostEvent[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % InMemoryCostStore.MAX_EVENTS;
      const event = this.buffer[idx];
      if (event) result.push(event);
    }
    return result;
  }

  async query(filters: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    model?: string;
    provider?: string;
  }): Promise<AICostEvent[]> {
    return this.getEvents().filter((event) => {
      if (filters.feature && event.feature !== filters.feature) return false;
      if (filters.startDate && event.timestamp < filters.startDate) return false;
      if (filters.endDate && event.timestamp > filters.endDate) return false;
      if (filters.userId && event.userId !== filters.userId) return false;
      if (filters.model && event.model !== filters.model) return false;
      if (filters.provider && event.provider !== filters.provider) return false;
      return true;
    });
  }

  async aggregate(
    period: 'daily' | 'weekly' | 'monthly',
    filters?: { startDate?: Date; endDate?: Date; userId?: string }
  ): Promise<CostSummary[]> {
    const events = await this.query(filters || {});
    const grouped = new Map<string, AICostEvent[]>();

    events.forEach((event) => {
      const date = this.getDateKey(event.timestamp, period);
      const existing = grouped.get(date) || [];
      existing.push(event);
      grouped.set(date, existing);
    });

    return Array.from(grouped.entries()).map(([date, events]) => ({
      date,
      totalCost: events.reduce((sum, e) => sum + e.costUSD, 0),
      totalTokens: events.reduce((sum, e) => sum + e.totalTokens, 0),
      requestCount: events.length,
      successCount: events.filter((e) => e.success).length,
      errorCount: events.filter((e) => !e.success).length,
      avgDurationMs: events.reduce((sum, e) => sum + e.durationMs, 0) / events.length,
    }));
  }

  async getFeatureCosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<FeatureCost[]> {
    const events = await this.query(filters || {});
    const grouped = new Map<string, AICostEvent[]>();

    events.forEach((event) => {
      const existing = grouped.get(event.feature) || [];
      existing.push(event);
      grouped.set(event.feature, existing);
    });

    return Array.from(grouped.entries()).map(([feature, events]) => {
      const totalCost = events.reduce((sum, e) => sum + e.costUSD, 0);
      const successCount = events.filter((e) => e.success).length;
      return {
        feature,
        totalCost,
        callCount: events.length,
        avgCostPerCall: totalCost / events.length,
        totalTokens: events.reduce((sum, e) => sum + e.totalTokens, 0),
        successRate: successCount / events.length,
        lastUsed: events.reduce(
          (latest, e) => (e.timestamp > latest ? e.timestamp : latest),
          events[0].timestamp
        ),
      };
    });
  }

  private getDateKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    const d = new Date(date);
    switch (period) {
      case 'daily': return d.toISOString().split('T')[0];
      case 'weekly': {
        const day = d.getDay();
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - day);
        return weekStart.toISOString().split('T')[0];
      }
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}
