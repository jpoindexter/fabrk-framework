import type { Meta, StoryObj } from '@storybook/react'
import { NPSSurvey } from './nps-survey'
import { fn } from '@storybook/test'

const meta = {
  title: 'Interactive/NPSSurvey',
  component: NPSSurvey,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NPSSurvey>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSubmit: fn(),
    onDismiss: fn(),
  },
}

export const CustomTitle: Story = {
  args: {
    onSubmit: fn(),
    title: 'How would you rate your experience with FABRK?',
  },
}

export const NoDismiss: Story = {
  args: {
    onSubmit: fn(),
    title: 'Quick survey before you go',
  },
}
