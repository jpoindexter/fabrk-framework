/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest'
import { createFeatureFlagManager } from './manager'

describe('FeatureFlagManager', () => {
  it('should return false for unknown flags', async () => {
    const flags = createFeatureFlagManager()
    expect(await flags.isEnabled('nonexistent')).toBe(false)
  })

  it('should return false for disabled flags', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({ name: 'dark-mode', enabled: false })

    expect(await flags.isEnabled('dark-mode')).toBe(false)
  })

  it('should return true for enabled flags', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({ name: 'dark-mode', enabled: true })

    expect(await flags.isEnabled('dark-mode')).toBe(true)
  })

  it('should enable for targeted users', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({
      name: 'beta',
      enabled: true,
      rolloutPercent: 0,
      targetUsers: ['user_1', 'user_2'],
    })

    expect(await flags.isEnabled('beta', { userId: 'user_1' })).toBe(true)
    expect(await flags.isEnabled('beta', { userId: 'user_999' })).toBe(false)
  })

  it('should enable for targeted roles', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({
      name: 'admin-panel',
      enabled: true,
      targetRoles: ['admin'],
    })

    expect(await flags.isEnabled('admin-panel', { role: 'admin' })).toBe(true)
    expect(await flags.isEnabled('admin-panel', { role: 'member' })).toBe(false)
  })

  it('should use deterministic rollout for same user', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({
      name: 'feature-x',
      enabled: true,
      rolloutPercent: 50,
    })

    const userId = 'user_deterministic'
    const result1 = await flags.isEnabled('feature-x', { userId })
    const result2 = await flags.isEnabled('feature-x', { userId })

    // Same user should get same result
    expect(result1).toBe(result2)
  })

  it('should enable for 100% rollout', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({
      name: 'fully-rolled-out',
      enabled: true,
      rolloutPercent: 100,
    })

    // 100% rollout is >= 100 so the rollout check is skipped, returns true
    expect(await flags.isEnabled('fully-rolled-out', { userId: 'anyone' })).toBe(true)
  })

  it('should get a specific flag', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({ name: 'my-flag', enabled: true, rolloutPercent: 75 })

    const flag = await flags.get('my-flag')
    expect(flag).toBeDefined()
    expect(flag!.name).toBe('my-flag')
    expect(flag!.rolloutPercent).toBe(75)
  })

  it('should return null for nonexistent flag', async () => {
    const flags = createFeatureFlagManager()
    expect(await flags.get('nope')).toBeNull()
  })

  it('should list all flags', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({ name: 'a', enabled: true })
    await flags.set({ name: 'b', enabled: false })

    const all = await flags.getAll()
    expect(all).toHaveLength(2)
  })

  it('should delete a flag', async () => {
    const flags = createFeatureFlagManager()
    await flags.set({ name: 'temp', enabled: true })
    await flags.delete('temp')

    expect(await flags.get('temp')).toBeNull()
    expect(await flags.isEnabled('temp')).toBe(false)
  })
})
