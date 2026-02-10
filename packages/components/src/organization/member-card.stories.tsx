import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { MemberCard } from './member-card'

const meta = {
  title: 'Organization/MemberCard',
  component: MemberCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MemberCard>

export default meta
type Story = StoryObj<typeof meta>

const baseMember = {
  id: 'user-1',
  name: 'Jason Poindexter',
  email: 'jason@fabrk.dev',
  role: 'Engineering Lead',
  bio: 'Building the future of AI-assisted development with FABRK Framework.',
  status: 'online' as const,
  skills: ['TypeScript', 'React', 'Next.js', 'AI'],
  memberSince: '2024-01-15',
}

export const Default: Story = {
  args: {
    member: baseMember,
    onEmail: fn(),
    onMessage: fn(),
    onEdit: fn(),
    onRemove: fn(),
    onViewProfile: fn(),
  },
}

export const Online: Story = {
  args: {
    member: {
      ...baseMember,
      status: 'online',
    },
    onEmail: fn(),
    onMessage: fn(),
  },
}

export const Compact: Story = {
  args: {
    member: {
      ...baseMember,
      status: 'away',
    },
    variant: 'compact',
    onEmail: fn(),
    onEdit: fn(),
    onRemove: fn(),
    onViewProfile: fn(),
  },
}
