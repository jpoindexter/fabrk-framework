import type { Meta, StoryObj } from '@storybook/react'
import { PieChart } from './pie-chart'

const meta = {
  title: 'Charts/PieChart',
  component: PieChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PieChart>

export default meta
type Story = StoryObj<typeof meta>

const sampleData = [
  { label: 'React', value: 45 },
  { label: 'Vue', value: 25 },
  { label: 'Angular', value: 15 },
  { label: 'Svelte', value: 10 },
  { label: 'Other', value: 5 },
]

export const Default: Story = {
  args: {
    data: sampleData,
    size: 300,
    showLegend: true,
    showPercentages: true,
  },
}

export const Donut: Story = {
  args: {
    data: sampleData,
    size: 300,
    innerRadius: 80,
    showLegend: true,
    showPercentages: true,
  },
}

export const WithLabels: Story = {
  args: {
    data: sampleData,
    size: 300,
    showLabels: true,
    showPercentages: true,
    showLegend: false,
  },
}

export const Small: Story = {
  args: {
    data: [
      { label: 'Used', value: 72 },
      { label: 'Free', value: 28 },
    ],
    size: 150,
    innerRadius: 40,
    showLegend: true,
    showPercentages: true,
  },
}
