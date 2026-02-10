import type { Meta, StoryObj } from '@storybook/react'
import { ASCIIProgressBar } from './ascii-progress-bar'

const meta = {
  title: 'Terminal/AsciiProgressBar',
  component: ASCIIProgressBar,
  tags: ['autodocs'],
} satisfies Meta<typeof ASCIIProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 25,
    label: '25%',
  },
}

export const HalfFull: Story = {
  args: {
    value: 50,
    label: '50%',
  },
}

export const Complete: Story = {
  args: {
    value: 100,
    label: '100%',
  },
}
