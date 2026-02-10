import type { Meta, StoryObj } from '@storybook/react'
import { StatusPulse } from './status-pulse'

const meta = {
  title: 'Display/StatusPulse',
  component: StatusPulse,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusPulse>

export default meta
type Story = StoryObj<typeof meta>

export const Online: Story = {
  args: {
    status: 'online',
  },
}

export const Error: Story = {
  args: {
    status: 'error',
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {(['online', 'syncing', 'offline', 'pending', 'success', 'warning', 'error'] as const).map(
        (status) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusPulse status={status} />
            <span style={{ fontSize: 12, textTransform: 'uppercase' }}>{status}</span>
          </div>
        )
      )}
    </div>
  ),
}
