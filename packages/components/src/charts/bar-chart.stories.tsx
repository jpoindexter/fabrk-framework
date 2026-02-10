import type { Meta, StoryObj } from '@storybook/react'
import { BarChart } from './bar-chart'

const meta = {
  title: 'Charts/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof BarChart>

export default meta
type Story = StoryObj<typeof meta>

const sampleData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 3800 },
  { month: 'Mar', revenue: 5100 },
  { month: 'Apr', revenue: 4600 },
  { month: 'May', revenue: 6200 },
]

export const Default: Story = {
  args: {
    data: sampleData,
    xAxisKey: 'month',
    series: [{ dataKey: 'revenue', name: 'Revenue' }],
    height: 300,
  },
}
