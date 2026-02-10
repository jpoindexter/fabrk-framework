import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from './empty-state'
import { FolderOpen, Inbox, Search } from 'lucide-react'
import { fn } from '@storybook/test'

const meta = {
  title: 'Display/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: FolderOpen,
    title: 'NO PROJECTS YET',
    description: 'Create your first project to get started.',
    action: {
      label: 'Create Project',
      onClick: fn(),
    },
  },
}

export const NoAction: Story = {
  args: {
    icon: Inbox,
    title: 'INBOX EMPTY',
    description: 'You have no new messages.',
  },
}

export const SearchEmpty: Story = {
  args: {
    icon: Search,
    title: 'NO RESULTS FOUND',
    description: 'Try adjusting your search terms or filters.',
    action: {
      label: 'Clear Filters',
      onClick: fn(),
    },
  },
}
