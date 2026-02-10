import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'NEW',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'BETA',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'ERROR',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'DRAFT',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge variant="default">DEFAULT</Badge>
      <Badge variant="secondary">SECONDARY</Badge>
      <Badge variant="accent">ACCENT</Badge>
      <Badge variant="destructive">DESTRUCTIVE</Badge>
      <Badge variant="neutral">NEUTRAL</Badge>
      <Badge variant="outline">OUTLINE</Badge>
    </div>
  ),
}
