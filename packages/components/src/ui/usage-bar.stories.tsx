import type { Meta, StoryObj } from '@storybook/react'
import { UsageBar } from './usage-bar'

const meta = {
  title: 'UI/UsageBar',
  component: UsageBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof UsageBar>

export default meta
type Story = StoryObj<typeof meta>

export const LowUsage: Story = {
  args: {
    value: 2500,
    max: 10000,
    label: 'API REQUESTS',
  },
}

export const HighUsage: Story = {
  args: {
    value: 8200,
    max: 10000,
    label: 'API REQUESTS',
    variant: 'warning',
  },
}

export const OverLimit: Story = {
  args: {
    value: 9800,
    max: 10000,
    label: 'API REQUESTS',
    variant: 'danger',
  },
}
