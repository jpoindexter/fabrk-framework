import { describe, it, expect } from 'vitest'
import { createAuditLogger } from './logger'
import { InMemoryAuditStore } from '../types'

describe('AuditLogger', () => {
  function setup() {
    const store = new InMemoryAuditStore()
    const logger = createAuditLogger(store)
    return { store, logger }
  }

  describe('log', () => {
    it('should log an audit event', async () => {
      const { logger } = setup()
      const event = await logger.log({
        actorId: 'user_1',
        action: 'user.login',
        resourceType: 'session',
        resourceId: 'sess_1',
      })

      expect(event.id).toBeDefined()
      expect(event.actorId).toBe('user_1')
      expect(event.action).toBe('user.login')
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.hash).toBeDefined()
      expect(event.hash!.length).toBe(64) // SHA-256 hex
    })

    it('should include optional fields', async () => {
      const { logger } = setup()
      const event = await logger.log({
        actorId: 'user_1',
        action: 'org.update',
        resourceType: 'org',
        resourceId: 'org_1',
        orgId: 'org_1',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        metadata: { field: 'name' },
      })

      expect(event.orgId).toBe('org_1')
      expect(event.ipAddress).toBe('127.0.0.1')
      expect(event.userAgent).toBe('TestAgent/1.0')
      expect(event.metadata).toEqual({ field: 'name' })
    })

    it('should create different hashes for sequential events', async () => {
      const { logger } = setup()
      const e1 = await logger.log({
        actorId: 'user_1',
        action: 'action_1',
        resourceType: 'test',
        resourceId: 'r1',
      })
      const e2 = await logger.log({
        actorId: 'user_1',
        action: 'action_2',
        resourceType: 'test',
        resourceId: 'r2',
      })

      expect(e1.hash).not.toBe(e2.hash)
    })
  })

  describe('query', () => {
    it('should query events by actor', async () => {
      const { logger } = setup()
      await logger.log({ actorId: 'user_1', action: 'a', resourceType: 'r', resourceId: '1' })
      await logger.log({ actorId: 'user_2', action: 'b', resourceType: 'r', resourceId: '2' })
      await logger.log({ actorId: 'user_1', action: 'c', resourceType: 'r', resourceId: '3' })

      const events = await logger.query({ actorId: 'user_1' })
      expect(events).toHaveLength(2)
      expect(events.every((e) => e.actorId === 'user_1')).toBe(true)
    })

    it('should query events by action', async () => {
      const { logger } = setup()
      await logger.log({ actorId: 'u', action: 'user.login', resourceType: 'r', resourceId: '1' })
      await logger.log({ actorId: 'u', action: 'user.logout', resourceType: 'r', resourceId: '2' })

      const events = await logger.query({ action: 'user.login' })
      expect(events).toHaveLength(1)
    })

    it('should return all events when no filters', async () => {
      const { logger } = setup()
      await logger.log({ actorId: 'u', action: 'a', resourceType: 'r', resourceId: '1' })
      await logger.log({ actorId: 'u', action: 'b', resourceType: 'r', resourceId: '2' })

      const events = await logger.query({})
      expect(events).toHaveLength(2)
    })
  })

  describe('verifyChain', () => {
    it('should verify a valid chain', async () => {
      const { logger } = setup()
      const e1 = await logger.log({ actorId: 'u', action: 'a', resourceType: 'r', resourceId: '1' })
      const e2 = await logger.log({ actorId: 'u', action: 'b', resourceType: 'r', resourceId: '2' })
      const e3 = await logger.log({ actorId: 'u', action: 'c', resourceType: 'r', resourceId: '3' })

      const valid = await logger.verifyChain([e1, e2, e3])
      expect(valid).toBe(true)
    })

    it('should detect tampering', async () => {
      const { logger } = setup()
      const e1 = await logger.log({ actorId: 'u', action: 'a', resourceType: 'r', resourceId: '1' })
      const e2 = await logger.log({ actorId: 'u', action: 'b', resourceType: 'r', resourceId: '2' })

      // Tamper with event
      e1.action = 'tampered'

      const valid = await logger.verifyChain([e1, e2])
      expect(valid).toBe(false)
    })

    it('should verify empty chain', async () => {
      const { logger } = setup()
      const valid = await logger.verifyChain([])
      expect(valid).toBe(true)
    })

    it('should reject events without hash', async () => {
      const { logger } = setup()
      const valid = await logger.verifyChain([
        {
          id: '1',
          actorId: 'u',
          action: 'a',
          resourceType: 'r',
          resourceId: '1',
          timestamp: new Date(),
          // no hash
        },
      ])
      expect(valid).toBe(false)
    })
  })
})
