import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '> SUBMIT',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: '> DELETE',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: '> CANCEL',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '> SETTINGS',
  },
}

export const Loading: Story = {
  args: {
    loading: true,
    children: '> SUBMIT',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="default">&gt; DEFAULT</Button>
      <Button variant="destructive">&gt; DESTRUCTIVE</Button>
      <Button variant="outline">&gt; OUTLINE</Button>
      <Button variant="secondary">&gt; SECONDARY</Button>
      <Button variant="ghost">&gt; GHOST</Button>
      <Button variant="link">&gt; LINK</Button>
    </div>
  ),
}
