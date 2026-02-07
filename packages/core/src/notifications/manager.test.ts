import { describe, it, expect, vi } from 'vitest'
import { createNotificationManager } from './manager'

describe('NotificationManager', () => {
  it('should create a notification', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'info',
      title: 'Test',
      message: 'Hello world',
    })

    expect(notification.id).toBeDefined()
    expect(notification.title).toBe('Test')
    expect(notification.message).toBe('Hello world')
    expect(notification.type).toBe('info')
    expect(notification.read).toBe(false)
    expect(notification.dismissed).toBe(false)
  })

  it('should set default priority to normal', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'info',
      title: 'Test',
      message: 'Hello',
    })

    expect(notification.priority).toBe('normal')
  })

  it('should set duration to 0 for error notifications', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'error',
      title: 'Error',
      message: 'Something broke',
    })

    expect(notification.duration).toBe(0)
  })

  it('should set default duration to 5000 for non-error notifications', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'success',
      title: 'Success',
      message: 'All good',
    })

    expect(notification.duration).toBe(5000)
  })

  it('should mark notification as read', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'info',
      title: 'Test',
      message: 'Hello',
    })

    await manager.markRead(notification.id)

    const unread = await manager.getUnreadCount('any')
    expect(unread).toBe(0)
  })

  it('should mark all as read', async () => {
    const manager = createNotificationManager()
    await manager.notify({ type: 'info', title: 'A', message: 'a' })
    await manager.notify({ type: 'info', title: 'B', message: 'b' })

    await manager.markAllRead('user_1')

    const count = await manager.getUnreadCount('user_1')
    expect(count).toBe(0)
  })

  it('should dismiss a notification', async () => {
    const manager = createNotificationManager()
    const notification = await manager.notify({
      type: 'info',
      title: 'Test',
      message: 'Hello',
    })

    await manager.dismiss(notification.id)

    const count = await manager.getUnreadCount('any')
    expect(count).toBe(0)
  })

  it('should track unread count', async () => {
    const manager = createNotificationManager()
    await manager.notify({ type: 'info', title: 'A', message: 'a' })
    await manager.notify({ type: 'info', title: 'B', message: 'b' })
    await manager.notify({ type: 'info', title: 'C', message: 'c' })

    const count = await manager.getUnreadCount('any')
    expect(count).toBe(3)
  })

  it('should notify subscribers', async () => {
    const manager = createNotificationManager()
    const callback = vi.fn()

    manager.subscribe(callback)

    await manager.notify({
      type: 'info',
      title: 'Test',
      message: 'Hello',
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test' })
    )
  })

  it('should unsubscribe', async () => {
    const manager = createNotificationManager()
    const callback = vi.fn()

    const unsubscribe = manager.subscribe(callback)
    unsubscribe()

    await manager.notify({ type: 'info', title: 'Test', message: 'Hello' })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should get notifications for user (memory store)', async () => {
    const manager = createNotificationManager()
    await manager.notify({ type: 'info', title: 'A', message: 'a' })
    await manager.notify({ type: 'error', title: 'B', message: 'b' })

    const all = await manager.getForUser('user')
    expect(all).toHaveLength(2)
  })

  it('should filter unread only', async () => {
    const manager = createNotificationManager()
    const n = await manager.notify({ type: 'info', title: 'A', message: 'a' })
    await manager.notify({ type: 'info', title: 'B', message: 'b' })

    await manager.markRead(n.id)

    const unread = await manager.getForUser('user', { unreadOnly: true })
    expect(unread).toHaveLength(1)
    expect(unread[0].title).toBe('B')
  })

  it('should respect limit', async () => {
    const manager = createNotificationManager()
    for (let i = 0; i < 5; i++) {
      await manager.notify({ type: 'info', title: `N${i}`, message: `m${i}` })
    }

    const limited = await manager.getForUser('user', { limit: 2 })
    expect(limited).toHaveLength(2)
  })
})
