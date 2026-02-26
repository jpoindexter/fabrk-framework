/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAuthStore, InMemoryApiKeyStore } from '../types'
import type { Session, ApiKeyInfo } from '@fabrk/core'

// InMemoryAuthStore

describe('InMemoryAuthStore', () => {
  let store: InMemoryAuthStore

  beforeEach(() => { store = new InMemoryAuthStore() })

  it('should create, retrieve, and delete a session', async () => {
    const session: Session & { token: string } = {
      token: 'session-token-1', userId: 'user-1', email: 'test@example.com', name: 'Test User',
    }

    await store.createSession(session)
    const retrieved = await store.getSession('session-token-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.userId).toBe('user-1')

    await store.deleteSession('session-token-1')
    expect(await store.getSession('session-token-1')).toBeNull()

    // Deleting non-existent should not throw
    await expect(store.deleteSession('non-existent')).resolves.toBeUndefined()
  })

  it('should return null for non-existent and expired sessions', async () => {
    expect(await store.getSession('non-existent-token')).toBeNull()

    await store.createSession({
      token: 'expired-token', userId: 'user-1', email: 'test@example.com',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(await store.getSession('expired-token')).toBeNull()
    // Second access also null (session was cleaned up)
    expect(await store.getSession('expired-token')).toBeNull()
  })

  it('should return valid sessions with future or no expiry', async () => {
    await store.createSession({
      token: 'valid-token', userId: 'user-1', email: 'test@example.com',
      expiresAt: new Date(Date.now() + 86400000),
    })
    expect((await store.getSession('valid-token'))!.userId).toBe('user-1')

    await store.createSession({ token: 'no-expiry', userId: 'user-2', email: 'test2@example.com' })
    expect(await store.getSession('no-expiry')).not.toBeNull()
  })
})

// InMemoryApiKeyStore

describe('InMemoryApiKeyStore', () => {
  let store: InMemoryApiKeyStore

  beforeEach(() => { store = new InMemoryApiKeyStore() })

  const createKeyInfo = (
    overrides: Partial<ApiKeyInfo & { hash: string; userId: string }> = {}
  ): ApiKeyInfo & { hash: string; userId: string } => ({
    id: 'key-1', prefix: 'fabrk_live_abc123', name: 'Test Key',
    scopes: ['read', 'write'], createdAt: new Date(), active: true,
    hash: 'sha256:abcdef1234567890', userId: 'user-1',
    ...overrides,
  })

  it('should create a key and retrieve it by hash', async () => {
    await store.create(createKeyInfo())
    const result = await store.getByHash('sha256:abcdef1234567890')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('key-1')
    expect(result!.scopes).toEqual(['read', 'write'])

    expect(await store.getByHash('sha256:nonexistent')).toBeNull()
  })

  it('should revoke a key and exclude it from listByUser', async () => {
    await store.create(createKeyInfo({ id: 'key-1', name: 'Active Key', hash: 'hash-1' }))
    await store.create(createKeyInfo({ id: 'key-2', name: 'Revoked Key', hash: 'hash-2' }))

    await store.revoke('key-2')
    expect((await store.getByHash('hash-2'))!.active).toBe(false)

    const keys = await store.listByUser('user-1')
    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('Active Key')

    // Revoking non-existent should not throw
    await expect(store.revoke('non-existent')).resolves.toBeUndefined()
  })

  it('should list active keys by user and return empty when none exist', async () => {
    expect(await store.listByUser('user-1')).toEqual([])

    await store.create(createKeyInfo({ id: 'key-1', hash: 'hash-1' }))
    await store.create(createKeyInfo({ id: 'key-2', hash: 'hash-2' }))
    expect(await store.listByUser('user-1')).toHaveLength(2)
  })

  it('should update lastUsedAt timestamp', async () => {
    await store.create(createKeyInfo())
    await store.updateLastUsed('key-1')

    const result = await store.getByHash('sha256:abcdef1234567890')
    expect(result!.lastUsedAt).toBeInstanceOf(Date)
    expect(Date.now() - result!.lastUsedAt!.getTime()).toBeLessThan(1000)

    // Non-existent key should not throw
    await expect(store.updateLastUsed('non-existent')).resolves.toBeUndefined()
  })
})
