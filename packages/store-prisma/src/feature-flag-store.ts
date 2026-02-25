import type { FeatureFlagStore, FeatureFlagOptions } from '@fabrk/core'
import type { PrismaClient } from './types'

export class PrismaFeatureFlagStore implements FeatureFlagStore {
  constructor(private prisma: PrismaClient) {}

  async get(name: string): Promise<FeatureFlagOptions | null> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { name } })
    return flag ? mapFlag(flag) : null
  }

  /**
   * Returns all feature flags ordered by name.
   * @remarks Returns up to 1000 flags. Cache results in your application layer.
   */
  async getAll(): Promise<FeatureFlagOptions[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
      take: 1000, // Feature flags are an admin resource; cache at application layer if needed
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return flags.map((f: any) => mapFlag(f))
  }

  /** @security No authorization check — caller must verify the requesting user has admin privileges. */
  async set(flag: FeatureFlagOptions): Promise<void> {
    const data = {
      name: flag.name,
      enabled: flag.enabled,
      rolloutPercent: flag.rolloutPercent,
      targetUsers: flag.targetUsers ?? [],
      targetRoles: flag.targetRoles ?? [],
      metadata: flag.metadata ?? {},
    }
    await this.prisma.featureFlag.upsert({
      where: { name: flag.name },
      create: data,
      update: data,
    })
  }

  /** @security No authorization check — caller must verify the requesting user has admin privileges. */
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
