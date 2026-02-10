import type { Meta, StoryObj } from '@storybook/react'
import { TokenCounter, TokenCounterGroup } from './token-counter'

const meta = {
  title: 'Terminal/TokenCounter',
  component: TokenCounter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof TokenCounter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 3200,
    max: 4096,
    label: 'Tokens',
  },
}

export const Compact: Story = {
  args: {
    value: 1500,
    max: 4096,
    variant: 'compact',
  },
}

export const Detailed: Story = {
  args: {
    value: 3800,
    max: 4096,
    variant: 'detailed',
    label: 'Context Window',
  },
}

export const OverLimit: Story = {
  args: {
    value: 4500,
    max: 4096,
    variant: 'detailed',
    label: 'Token Usage',
  },
}

export const Group: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <TokenCounterGroup
        variant="default"
        counters={[
          { value: 2048, max: 4096, label: 'Input Tokens' },
          { value: 512, max: 2048, label: 'Output Tokens' },
          { value: 3900, max: 4096, label: 'Context Window' },
        ]}
      />
    </div>
  ),
}
