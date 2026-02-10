import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { StarRating } from './star-rating'

const meta = {
  title: 'Interactive/StarRating',
  component: StarRating,
  tags: ['autodocs'],
} satisfies Meta<typeof StarRating>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 3,
    max: 5,
  },
}

export const ReadOnly: Story = {
  args: {
    value: 4,
    max: 5,
    readonly: true,
    size: 'lg',
  },
}

function InteractiveRender() {
  const [rating, setRating] = useState(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
        Selected: {rating} / 5
      </p>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveRender />,
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <StarRating value={3} size="sm" readonly />
      <StarRating value={3} size="md" readonly />
      <StarRating value={3} size="lg" readonly />
    </div>
  ),
}
