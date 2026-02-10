import type { Meta, StoryObj } from '@storybook/react'
import { KpiCard } from './kpi-card'

const meta = {
  title: 'Data/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
} satisfies Meta<typeof KpiCard>

export default meta
type Story = StoryObj<typeof meta>

export const TrendUp: Story = {
  args: {
    title: 'REVENUE',
    value: '$45,231',
    change: 12,
    trend: 'up',
  },
}

export const TrendDown: Story = {
  args: {
    title: 'CHURN RATE',
    value: '3.2%',
    change: 8,
    trend: 'down',
  },
}

export const Neutral: Story = {
  args: {
    title: 'ACTIVE USERS',
    value: '1,204',
    change: 0,
    trend: 'neutral',
  },
}

export const WithSubtitle: Story = {
  args: {
    title: 'TOTAL REQUESTS',
    value: '842K',
    change: 5,
    trend: 'up',
    subtitle: 'vs last month',
  },
}
