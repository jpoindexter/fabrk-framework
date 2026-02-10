import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { NotificationCenter } from './notification-center'

const meta = {
  title: 'Notifications/NotificationCenter',
  component: NotificationCenter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NotificationCenter>

export default meta
type Story = StoryObj<typeof meta>

const now = new Date()

export const WithUnread: Story = {
  args: {
    notifications: [
      {
        id: '1',
        type: 'info',
        title: 'DEPLOY COMPLETE',
        message: 'Production deployment v2.1.0 is live. All health checks passing.',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        read: false,
      },
      {
        id: '2',
        type: 'warning',
        title: 'RATE LIMIT WARNING',
        message: 'API endpoint /api/v1/users approaching rate limit threshold (85%).',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000),
        read: false,
      },
      {
        id: '3',
        type: 'success',
        title: 'BUILD SUCCEEDED',
        message: 'CI pipeline completed successfully. 410 tests passed.',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: '4',
        type: 'error',
        title: 'WEBHOOK FAILURE',
        message: 'Stripe webhook endpoint returned 500. Retrying in 30 seconds.',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        read: false,
      },
      {
        id: '5',
        type: 'mention',
        title: 'MENTIONED IN PR',
        message: '@jason was mentioned in PR #142: "Add chart components".',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        read: true,
      },
    ],
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onClearAll: fn(),
  },
}

export const AllRead: Story = {
  args: {
    notifications: [
      {
        id: '1',
        type: 'info',
        title: 'SYSTEM UPDATE',
        message: 'Framework updated to v2.1.0 with 18 new themes.',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        read: true,
      },
      {
        id: '2',
        type: 'success',
        title: 'TESTS PASSED',
        message: 'All 410 tests passed in CI pipeline.',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        read: true,
      },
    ],
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onClearAll: fn(),
  },
}

export const Empty: Story = {
  args: {
    notifications: [],
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onClearAll: fn(),
  },
}
