import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { PageHeader } from './page-header'

const meta = {
  title: 'UI/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'COMPONENTS',
    totalCount: 279,
    tabs: [
      { value: 'all', label: 'All', count: 279 },
      { value: 'ui', label: 'UI', count: 183 },
      { value: 'charts', label: 'Charts', count: 8 },
      { value: 'admin', label: 'Admin', count: 12 },
    ],
    activeTab: 'all',
    onTabChange: fn(),
    searchQuery: '',
    onSearchChange: fn(),
    searchPlaceholder: 'Search components...',
  },
}

export const WithActions: Story = {
  args: {
    title: 'REPOSITORIES',
    totalCount: 42,
    tabs: [
      { value: 'all', label: 'All', count: 42 },
      { value: 'active', label: 'Active', count: 28 },
      { value: 'archived', label: 'Archived', count: 14 },
    ],
    activeTab: 'all',
    onTabChange: fn(),
    searchQuery: '',
    onSearchChange: fn(),
  },
}
