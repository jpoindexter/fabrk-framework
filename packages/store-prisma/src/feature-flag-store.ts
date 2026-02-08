/**
 * Prisma-based Feature Flag Store
 *
 * Persists feature flags to the database.
 */

import type { FeatureFlagStore, FeatureFlagOptions } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaFeatureFlagStore implements FeatureFlagStore {
  constructor(private prisma: PrismaClient) {}

  async get(name: string): Promise<FeatureFlagOptions | null> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { name } })
    return flag ? mapFlag(flag) : null
  }

  async getAll(): Promise<FeatureFlagOptions[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return flags.map((f: any) => mapFlag(f))
  }

  async set(flag: FeatureFlagOptions): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { name: flag.name },
      create: {
        name: flag.name,
        enabled: flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        targetUsers: flag.targetUsers ?? [],
        targetRoles: flag.targetRoles ?? [],
        metadata: flag.metadata ?? {},
      },
      update: {
        enabled: flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        targetUsers: flag.targetUsers ?? [],
        targetRoles: flag.targetRoles ?? [],
        metadata: flag.metadata ?? {},
      },
    })
  }

  async delete(name: string): Promise<void> {
    await this.prisma.featureFlag.delete({ where: { name } })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFlag(raw: any): FeatureFlagOptions {
  return {
    name: raw.name,
    enabled: raw.enabled,
    rolloutPercent: raw.rolloutPercent ?? undefined,
    targetUsers: raw.targetUsers ?? [],
    targetRoles: raw.targetRoles ?? [],
    metadata: raw.metadata ?? undefined,
  }
}
