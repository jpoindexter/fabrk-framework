// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { NotificationCenter, NotificationCenterItem } from '../../notifications/notification-center'

const now = new Date()

const sampleNotifications: NotificationCenterItem[] = [
  {
    id: 'n1',
    type: 'info',
    title: 'Deploy complete',
    message: 'v2.1.0 is now live in production',
    timestamp: now,
    read: false,
  },
  {
    id: 'n2',
    type: 'warning',
    title: 'Rate limit warning',
    message: 'API nearing quota at 85%',
    timestamp: now,
    read: true,
  },
  {
    id: 'n3',
    type: 'success',
    title: 'Tests passed',
    message: 'All 410 tests passed successfully',
    timestamp: now,
    read: false,
  },
]

describe('NotificationCenter', () => {
  const defaultProps = {
    notifications: sampleNotifications,
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    onDelete: vi.fn(),
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<NotificationCenter {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the bell trigger button', () => {
    render(<NotificationCenter {...defaultProps} />)
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument()
  })

  it('shows unread count badge on the bell', () => {
    render(<NotificationCenter {...defaultProps} />)
    // 2 unread notifications (n1 and n3)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows notifications when dropdown is opened', async () => {
    const { user } = render(<NotificationCenter {...defaultProps} />)

    await user.click(screen.getByLabelText(/notifications/i))

    expect(screen.getByText('Deploy complete')).toBeInTheDocument()
    expect(screen.getByText('Rate limit warning')).toBeInTheDocument()
    expect(screen.getByText('Tests passed')).toBeInTheDocument()
  })

  it('shows the Notifications header inside dropdown', async () => {
    const { user } = render(<NotificationCenter {...defaultProps} />)

    await user.click(screen.getByLabelText(/notifications/i))

    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('shows notification messages', async () => {
    const { user } = render(<NotificationCenter {...defaultProps} />)

    await user.click(screen.getByLabelText(/notifications/i))

    expect(screen.getByText('v2.1.0 is now live in production')).toBeInTheDocument()
    expect(screen.getByText('API nearing quota at 85%')).toBeInTheDocument()
  })

  it('shows empty state when no notifications', async () => {
    const { user } = render(
      <NotificationCenter notifications={[]} onMarkAsRead={vi.fn()} />
    )

    await user.click(screen.getByLabelText(/notifications/i))

    expect(screen.getByText("You're all caught up!")).toBeInTheDocument()
  })

  it('does not show unread badge when all notifications are read', () => {
    const allRead = sampleNotifications.map((n) => ({ ...n, read: true }))
    render(<NotificationCenter notifications={allRead} onMarkAsRead={vi.fn()} />)

    // No unread count badge should appear
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('shows 9+ when there are more than 9 unread notifications', () => {
    const manyUnread: NotificationCenterItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `n-${i}`,
      type: 'info' as const,
      title: `Notification ${i}`,
      message: `Message ${i}`,
      timestamp: now,
      read: false,
    }))

    render(<NotificationCenter notifications={manyUnread} onMarkAsRead={vi.fn()} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })
})
