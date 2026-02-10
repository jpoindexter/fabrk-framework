import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackWidget } from './feedback-widget'
import { fn } from '@storybook/test'

const meta = {
  title: 'Interactive/FeedbackWidget',
  component: FeedbackWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FeedbackWidget>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSubmit: fn(),
    position: 'bottom-right',
  },
}

export const BottomLeft: Story = {
  args: {
    onSubmit: fn(),
    position: 'bottom-left',
  },
}

export const CustomLabel: Story = {
  args: {
    onSubmit: fn(),
    triggerLabel: '> REPORT ISSUE',
    position: 'bottom-right',
  },
}
