import type { Meta, StoryObj } from '@storybook/react'
import { AreaChart, StackedAreaChart } from './area-chart'

const meta = {
  title: 'Charts/AreaChart',
  component: AreaChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AreaChart>

export default meta
type Story = StoryObj<typeof meta>

const sampleData = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 3800, expenses: 2600 },
  { month: 'Mar', revenue: 5100, expenses: 3200 },
  { month: 'Apr', revenue: 4600, expenses: 2900 },
  { month: 'May', revenue: 6200, expenses: 3500 },
  { month: 'Jun', revenue: 5800, expenses: 3100 },
]

export const Default: Story = {
  args: {
    data: sampleData,
    xAxisKey: 'month',
    series: [
      { dataKey: 'revenue', name: 'Revenue' },
    ],
    height: 300,
  },
}

export const MultiSeries: Story = {
  args: {
    data: sampleData,
    xAxisKey: 'month',
    series: [
      { dataKey: 'revenue', name: 'Revenue' },
      { dataKey: 'expenses', name: 'Expenses' },
    ],
    height: 300,
    showLegend: true,
  },
}

export const Stacked: Story = {
  render: () => (
    <StackedAreaChart
      data={sampleData}
      xAxisKey="month"
      stackKeys={['revenue', 'expenses']}
      stackLabels={['Revenue', 'Expenses']}
      height={300}
    />
  ),
}

export const NoGrid: Story = {
  args: {
    data: sampleData,
    xAxisKey: 'month',
    series: [
      { dataKey: 'revenue', name: 'Revenue', type: 'monotone', showDots: true },
    ],
    height: 300,
    showGrid: false,
    gradient: true,
  },
}
