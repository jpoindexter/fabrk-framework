import type { Meta, StoryObj } from '@storybook/react'
import { TeamActivityFeed } from './team-activity-feed'
import type { TeamActivity } from './team-activity-feed'

const meta = {
  title: 'Organization/TeamActivityFeed',
  component: TeamActivityFeed,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof TeamActivityFeed>

export default meta
type Story = StoryObj<typeof meta>

const now = new Date()

const sampleActivities: TeamActivity[] = [
  {
    id: '1',
    type: 'created',
    user: { name: 'Jason Poindexter' },
    action: 'created',
    target: 'dashboard-shell.tsx',
    timestamp: new Date(now.getTime() - 5 * 60 * 1000),
  },
  {
    id: '2',
    type: 'commented',
    user: { name: 'Sarah Chen' },
    action: 'commented on',
    target: 'PR #142: Add chart components',
    timestamp: new Date(now.getTime() - 30 * 60 * 1000),
  },
  {
    id: '3',
    type: 'invited',
    user: { name: 'Alex Rivera' },
    action: 'invited',
    target: 'maya@fabrk.dev to the team',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'completed',
    user: { name: 'Maya Johnson' },
    action: 'completed',
    target: 'Security audit review',
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    metadata: { priority: 'high', sprint: 'v2.1' },
  },
  {
    id: '5',
    type: 'uploaded',
    user: { name: 'Chris Park' },
    action: 'uploaded',
    target: 'design-tokens-v3.json',
    timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
  },
]

export const Default: Story = {
  args: {
    activities: sampleActivities,
    maxHeight: 500,
  },
}

export const Empty: Story = {
  args: {
    activities: [],
  },
}
