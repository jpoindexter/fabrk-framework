/**
 * Prisma-based API Key Store
 *
 * Persists API keys with SHA-256 hashes to the database.
 */

import type { ApiKeyStore, ApiKeyInfo } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaApiKeyStore implements ApiKeyStore {
  constructor(private prisma: PrismaClient) {}

  async getByHash(hash: string): Promise<ApiKeyInfo | null> {
    const key = await this.prisma.apiKey.findFirst({
      where: { hash, active: true },
    })
    return key ? mapKey(key) : null
  }

  async create(key: ApiKeyInfo & { hash: string }): Promise<void> {
    await this.prisma.apiKey.create({
      data: {
        id: key.id,
        prefix: key.prefix,
        hash: key.hash,
        name: key.name,
        scopes: key.scopes,
        userId: (key as ApiKeyInfo & { hash: string; userId?: string }).userId,
        active: key.active,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
      },
    })
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { active: false, revokedAt: new Date() },
    })
  }

  async listByUser(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return keys.map((k: any) => mapKey(k))
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapKey(raw: any): ApiKeyInfo {
  return {
    id: raw.id,
    prefix: raw.prefix,
    name: raw.name,
    scopes: raw.scopes ?? [],
    createdAt: raw.createdAt,
    lastUsedAt: raw.lastUsedAt ?? undefined,
    expiresAt: raw.expiresAt ?? undefined,
    active: raw.active,
  }
}
