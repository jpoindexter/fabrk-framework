import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { FunnelChart } from './funnel-chart'

const meta = {
  title: 'Charts/FunnelChart',
  component: FunnelChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FunnelChart>

export default meta
type Story = StoryObj<typeof meta>

const conversionData = [
  { label: 'VISITORS', value: 10000 },
  { label: 'SIGNUPS', value: 4200 },
  { label: 'ACTIVATED', value: 2800 },
  { label: 'SUBSCRIBED', value: 1400 },
  { label: 'RETAINED', value: 980 },
]

export const Default: Story = {
  args: {
    data: conversionData,
    height: 400,
    width: 500,
    showValues: true,
    showPercentages: true,
    onStageClick: fn(),
  },
}

export const WithPercentages: Story = {
  args: {
    data: [
      { label: 'PAGE VIEWS', value: 25000 },
      { label: 'ADD TO CART', value: 8500 },
      { label: 'CHECKOUT', value: 3200 },
      { label: 'PURCHASED', value: 1800 },
    ],
    height: 350,
    width: 500,
    showValues: true,
    showPercentages: true,
    direction: 'vertical',
    onStageClick: fn(),
  },
}
