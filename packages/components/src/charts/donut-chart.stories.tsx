import type { Meta, StoryObj } from '@storybook/react'
import { DonutChart } from './donut-chart'

const meta = {
  title: 'Charts/DonutChart',
  component: DonutChart,
  tags: ['autodocs'],
} satisfies Meta<typeof DonutChart>

export default meta
type Story = StoryObj<typeof meta>

const sampleData = [
  { label: 'Desktop', value: 45 },
  { label: 'Mobile', value: 30 },
  { label: 'Tablet', value: 15 },
  { label: 'Other', value: 10 },
]

export const Default: Story = {
  args: {
    data: sampleData,
    size: 300,
    thickness: 60,
    showLegend: true,
    showPercentages: true,
  },
}
