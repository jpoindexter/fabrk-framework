import type { Meta, StoryObj } from '@storybook/react'
import { TerminalSpinner } from './terminal-spinner'

const meta = {
  title: 'Terminal/TerminalSpinner',
  component: TerminalSpinner,
  tags: ['autodocs'],
} satisfies Meta<typeof TerminalSpinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithLabel: Story = {
  args: {
    label: 'Loading data...',
    size: 'md',
  },
}
