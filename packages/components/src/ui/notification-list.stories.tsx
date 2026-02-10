import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { NotificationList } from './notification-list'

const meta = {
  title: 'UI/NotificationList',
  component: NotificationList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NotificationList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    notifications: [
      {
        id: '1',
        title: 'DEPLOY COMPLETE',
        description: 'Production deployment v2.1.0 is live. All health checks passing.',
        time: '5 minutes ago',
        read: false,
        type: 'success',
      },
      {
        id: '2',
        title: 'RATE LIMIT WARNING',
        description: 'API endpoint /api/v1/users approaching rate limit threshold.',
        time: '30 minutes ago',
        read: false,
        type: 'warning',
      },
      {
        id: '3',
        title: 'BUILD SUCCEEDED',
        description: 'CI pipeline completed. 410 tests passed.',
        time: '2 hours ago',
        read: true,
        type: 'info',
      },
      {
        id: '4',
        title: 'WEBHOOK FAILURE',
        description: 'Stripe webhook endpoint returned 500. Retrying in 30 seconds.',
        time: '1 day ago',
        read: true,
        type: 'error',
      },
    ],
    onMarkAsRead: fn(),
    onDismiss: fn(),
  },
}

export const Empty: Story = {
  args: {
    notifications: [],
    onMarkAsRead: fn(),
    onDismiss: fn(),
  },
}
