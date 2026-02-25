import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAuthStore, InMemoryApiKeyStore } from '../types'
import type { Session, ApiKeyInfo } from '@fabrk/core'

// ============================================================================
// InMemoryAuthStore
// ============================================================================

describe('InMemoryAuthStore', () => {
  let store: InMemoryAuthStore

  beforeEach(() => {
    store = new InMemoryAuthStore()
  })

  it('should create and retrieve a session', async () => {
    const session: Session & { token: string } = {
      token: 'session-token-1',
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    }

    await store.createSession(session)
    const retrieved = await store.getSession('session-token-1')

    expect(retrieved).not.toBeNull()
    expect(retrieved!.userId).toBe('user-1')
    expect(retrieved!.email).toBe('test@example.com')
    expect(retrieved!.name).toBe('Test User')
  })

  it('should return null for non-existent session', async () => {
    const result = await store.getSession('non-existent-token')
    expect(result).toBeNull()
  })

  it('should delete a session', async () => {
    const session: Session & { token: string } = {
      token: 'session-to-delete',
      userId: 'user-1',
      email: 'test@example.com',
    }

    await store.createSession(session)
    expect(await store.getSession('session-to-delete')).not.toBeNull()

    await store.deleteSession('session-to-delete')
    expect(await store.getSession('session-to-delete')).toBeNull()
  })

  it('should not throw when deleting non-existent session', async () => {
    await expect(store.deleteSession('non-existent')).resolves.toBeUndefined()
  })

  it('should store multiple sessions independently', async () => {
    const session1: Session & { token: string } = {
      token: 'token-1',
      userId: 'user-1',
      email: 'user1@example.com',
    }
    const session2: Session & { token: string } = {
      token: 'token-2',
      userId: 'user-2',
      email: 'user2@example.com',
    }

    await store.createSession(session1)
    await store.createSession(session2)

    const retrieved1 = await store.getSession('token-1')
    const retrieved2 = await store.getSession('token-2')

    expect(retrieved1!.userId).toBe('user-1')
    expect(retrieved2!.userId).toBe('user-2')
  })

  it('should return null for expired sessions', async () => {
    const expiredSession: Session & { token: string } = {
      token: 'expired-token',
      userId: 'user-1',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
    }

    await store.createSession(expiredSession)
    const result = await store.getSession('expired-token')
    expect(result).toBeNull()
  })

  it('should delete expired sessions from storage on access', async () => {
    const expiredSession: Session & { token: string } = {
      token: 'expired-cleanup',
      userId: 'user-1',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() - 1000),
    }

    await store.createSession(expiredSession)

    // First access returns null and cleans up
    await store.getSession('expired-cleanup')

    // Second access also returns null (session was deleted)
    const result = await store.getSession('expired-cleanup')
    expect(result).toBeNull()
  })

  it('should return valid sessions that have not expired', async () => {
    const validSession: Session & { token: string } = {
      token: 'valid-token',
      userId: 'user-1',
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    }

    await store.createSession(validSession)
    const result = await store.getSession('valid-token')
    expect(result).not.toBeNull()
    expect(result!.userId).toBe('user-1')
  })

  it('should return sessions with no expiresAt (never expire)', async () => {
    const session: Session & { token: string } = {
      token: 'no-expiry',
      userId: 'user-1',
      email: 'test@example.com',
      // No expiresAt
    }

    await store.createSession(session)
    const result = await store.getSession('no-expiry')
    expect(result).not.toBeNull()
  })

  it('should overwrite a session with the same token', async () => {
    const session1: Session & { token: string } = {
      token: 'same-token',
      userId: 'user-1',
      email: 'original@example.com',
    }
    const session2: Session & { token: string } = {
      token: 'same-token',
      userId: 'user-2',
      email: 'updated@example.com',
    }

    await store.createSession(session1)
    await store.createSession(session2)

    const result = await store.getSession('same-token')
    expect(result!.userId).toBe('user-2')
    expect(result!.email).toBe('updated@example.com')
  })
})

// ============================================================================
// InMemoryApiKeyStore
// ============================================================================

describe('InMemoryApiKeyStore', () => {
  let store: InMemoryApiKeyStore

  beforeEach(() => {
    store = new InMemoryApiKeyStore()
  })

  const createKeyInfo = (
    overrides: Partial<ApiKeyInfo & { hash: string; userId?: string }> = {}
  ): ApiKeyInfo & { hash: string; userId?: string } => ({
    id: 'key-1',
    prefix: 'fabrk_live_abc123',
    name: 'Test Key',
    scopes: ['read', 'write'],
    createdAt: new Date(),
    active: true,
    hash: 'sha256:abcdef1234567890',
    userId: 'user-1',
    ...overrides,
  })

  it('should create a key and retrieve it by hash', async () => {
    const key = createKeyInfo()
    await store.create(key)

    const result = await store.getByHash('sha256:abcdef1234567890')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('key-1')
    expect(result!.name).toBe('Test Key')
    expect(result!.scopes).toEqual(['read', 'write'])
  })

  it('should return null for non-existent hash', async () => {
    const result = await store.getByHash('sha256:nonexistent')
    expect(result).toBeNull()
  })

  it('should revoke a key', async () => {
    const key = createKeyInfo()
    await store.create(key)

    await store.revoke('key-1')

    // Key still exists but is inactive
    const result = await store.getByHash('sha256:abcdef1234567890')
    expect(result).not.toBeNull()
    expect(result!.active).toBe(false)
  })

  it('should not throw when revoking non-existent key', async () => {
    await expect(store.revoke('non-existent')).resolves.toBeUndefined()
  })

  it('should list active keys by user', async () => {
    const key1 = createKeyInfo({ id: 'key-1', name: 'Key 1', hash: 'hash-1' })
    const key2 = createKeyInfo({ id: 'key-2', name: 'Key 2', hash: 'hash-2' })

    await store.create(key1)
    await store.create(key2)

    const keys = await store.listByUser('user-1')
    expect(keys).toHaveLength(2)
  })

  it('should not list revoked keys', async () => {
    const key1 = createKeyInfo({ id: 'key-1', name: 'Active Key', hash: 'hash-1' })
    const key2 = createKeyInfo({ id: 'key-2', name: 'Revoked Key', hash: 'hash-2' })

    await store.create(key1)
    await store.create(key2)

    await store.revoke('key-2')

    const keys = await store.listByUser('user-1')
    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('Active Key')
  })

  it('should return empty array when no keys exist', async () => {
    const keys = await store.listByUser('user-1')
    expect(keys).toEqual([])
  })

  it('should update lastUsedAt timestamp', async () => {
    const key = createKeyInfo()
    await store.create(key)

    expect(key.lastUsedAt).toBeUndefined()

    await store.updateLastUsed('key-1')

    const result = await store.getByHash('sha256:abcdef1234567890')
    expect(result).not.toBeNull()
    expect(result!.lastUsedAt).toBeInstanceOf(Date)
    // Should be very recent
    expect(Date.now() - result!.lastUsedAt!.getTime()).toBeLessThan(1000)
  })

  it('should not throw when updating lastUsed for non-existent key', async () => {
    await expect(store.updateLastUsed('non-existent')).resolves.toBeUndefined()
  })

  it('should handle multiple keys with different hashes', async () => {
    const key1 = createKeyInfo({ id: 'key-1', hash: 'hash-aaa' })
    const key2 = createKeyInfo({ id: 'key-2', hash: 'hash-bbb' })
    const key3 = createKeyInfo({ id: 'key-3', hash: 'hash-ccc' })

    await store.create(key1)
    await store.create(key2)
    await store.create(key3)

    expect((await store.getByHash('hash-aaa'))!.id).toBe('key-1')
    expect((await store.getByHash('hash-bbb'))!.id).toBe('key-2')
    expect((await store.getByHash('hash-ccc'))!.id).toBe('key-3')
  })

  it('should overwrite key with same id', async () => {
    const key1 = createKeyInfo({ id: 'key-1', name: 'Original', hash: 'hash-1' })
    const key2 = createKeyInfo({ id: 'key-1', name: 'Updated', hash: 'hash-2' })

    await store.create(key1)
    await store.create(key2)

    // Old hash should not find anything (overwritten)
    const oldResult = await store.getByHash('hash-1')
    expect(oldResult).toBeNull()

    // New hash should find the updated key
    const newResult = await store.getByHash('hash-2')
    expect(newResult).not.toBeNull()
    expect(newResult!.name).toBe('Updated')
  })

  it('should preserve key metadata through operations', async () => {
    const key = createKeyInfo({
      id: 'key-1',
      name: 'Metadata Key',
      scopes: ['admin', 'read', 'write'],
      hash: 'hash-meta',
    })

    await store.create(key)
    await store.updateLastUsed('key-1')

    const result = await store.getByHash('hash-meta')
    expect(result!.name).toBe('Metadata Key')
    expect(result!.scopes).toEqual(['admin', 'read', 'write'])
    expect(result!.active).toBe(true)
    expect(result!.createdAt).toBeInstanceOf(Date)
  })
})
