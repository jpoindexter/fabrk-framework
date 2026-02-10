import type { Meta, StoryObj } from '@storybook/react'
import { SystemHealthWidget } from './system-health'

const meta = {
  title: 'Admin/SystemHealthWidget',
  component: SystemHealthWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof SystemHealthWidget>

export default meta
type Story = StoryObj<typeof meta>

export const Healthy: Story = {
  args: {
    code: '0x00',
    uptime: 99.95,
    avgResponseTime: 120,
    errorRate: 0.1,
    requestsPerMinute: 1850,
    lastUpdated: new Date(),
  },
}

export const Degraded: Story = {
  args: {
    code: '0xFF',
    uptime: 99.2,
    avgResponseTime: 450,
    errorRate: 1.8,
    requestsPerMinute: 620,
    lastUpdated: new Date(),
  },
}
