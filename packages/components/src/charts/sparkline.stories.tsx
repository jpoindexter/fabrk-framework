import type { Meta, StoryObj } from '@storybook/react'
import { Sparkline, SparklineCard, SparklineGroup } from './sparkline'

const meta = {
  title: 'Charts/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
} satisfies Meta<typeof Sparkline>

export default meta
type Story = StoryObj<typeof meta>

const trendData = [12, 18, 14, 22, 19, 28, 25, 32, 30, 35]

export const Default: Story = {
  args: {
    data: trendData,
    width: 120,
    height: 32,
  },
}

export const WithArea: Story = {
  args: {
    data: trendData,
    width: 120,
    height: 32,
    showArea: true,
  },
}

export const WithDots: Story = {
  args: {
    data: trendData,
    width: 160,
    height: 40,
    showDots: true,
    showArea: true,
  },
}

export const Card: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <SparklineCard
        title="MONTHLY REVENUE"
        value="$12,450"
        change={{ value: 12.5, label: 'vs last month' }}
        data={[8, 12, 10, 15, 14, 18, 22, 20, 25, 28]}
        showArea
      />
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <SparklineGroup
        items={[
          { label: 'Users', value: 1204, data: [10, 15, 12, 18, 22, 20, 25] },
          { label: 'Revenue', value: 8450, data: [5, 8, 12, 10, 15, 18, 22] },
          { label: 'Requests', value: 42100, data: [20, 18, 25, 30, 28, 35, 40] },
        ]}
      />
    </div>
  ),
}
