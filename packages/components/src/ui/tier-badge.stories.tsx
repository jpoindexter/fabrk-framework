import type { Meta, StoryObj } from '@storybook/react'
import { TierBadge } from './tier-badge'

const meta = {
  title: 'Display/TierBadge',
  component: TierBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof TierBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Free: Story = {
  args: {
    tier: 'free',
    showIcon: true,
    size: 'md',
  },
}

export const Pro: Story = {
  args: {
    tier: 'pro',
    showIcon: true,
    size: 'md',
  },
}

export const Enterprise: Story = {
  args: {
    tier: 'enterprise',
    showIcon: true,
    size: 'lg',
  },
}

export const AllTiers: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <TierBadge tier="free" />
      <TierBadge tier="trial" />
      <TierBadge tier="pro" />
      <TierBadge tier="team" />
      <TierBadge tier="enterprise" />
    </div>
  ),
}

export const NoIcon: Story = {
  args: {
    tier: 'pro',
    showIcon: false,
  },
}
