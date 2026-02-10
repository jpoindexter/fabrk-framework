import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter email address',
  },
}

export const WithError: Story = {
  args: {
    placeholder: 'Enter email address',
    error: true,
    defaultValue: 'invalid-email',
  },
}

export const Loading: Story = {
  args: {
    placeholder: 'Searching...',
    loading: true,
    loadingText: 'Searching records',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
    defaultValue: 'Cannot edit',
  },
}
