import type { Meta, StoryObj } from '@storybook/react'
import { AiChatInput } from './chat-input'
import { fn } from '@storybook/test'

const meta = {
  title: 'AI/ChatInput',
  component: AiChatInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AiChatInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSend: fn(),
    onStop: fn(),
    isLoading: false,
  },
}
