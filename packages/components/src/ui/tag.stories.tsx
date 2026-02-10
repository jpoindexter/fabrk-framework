import type { Meta, StoryObj } from '@storybook/react'
import { Tag, TagGroup } from './tag'
import { fn } from '@storybook/test'

const meta = {
  title: 'Display/Tag',
  component: Tag,
  tags: ['autodocs'],
} satisfies Meta<typeof Tag>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'TYPESCRIPT',
  },
}

export const Muted: Story = {
  args: {
    children: 'DRAFT',
    variant: 'muted',
  },
}

export const Removable: Story = {
  args: {
    children: 'REACT',
    onRemove: fn(),
  },
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Tag size="xs">XS</Tag>
      <Tag size="sm">SM</Tag>
      <Tag size="md">MD</Tag>
      <Tag size="lg">LG</Tag>
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <TagGroup>
      <Tag onRemove={fn()}>REACT</Tag>
      <Tag onRemove={fn()}>TYPESCRIPT</Tag>
      <Tag onRemove={fn()}>NEXT.JS</Tag>
      <Tag variant="muted">+3 MORE</Tag>
    </TagGroup>
  ),
}
