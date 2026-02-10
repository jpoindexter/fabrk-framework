import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Sidebar } from './sidebar'

const meta = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

const sampleItems = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'repos', label: 'REPOSITORIES' },
  { id: 'components', label: 'COMPONENTS' },
  {
    id: 'settings',
    label: 'SETTINGS',
    children: [
      { id: 'general', label: 'GENERAL' },
      { id: 'security', label: 'SECURITY' },
      { id: 'billing', label: 'BILLING' },
    ],
  },
]

export const Default: Story = {
  args: {
    items: sampleItems,
    onItemClick: fn(),
  },
  render: (args) => (
    <div style={{ height: '400px' }}>
      <Sidebar {...args} />
    </div>
  ),
}

export const Collapsed: Story = {
  args: {
    items: sampleItems,
    defaultCollapsed: true,
    onItemClick: fn(),
  },
  render: (args) => (
    <div style={{ height: '400px' }}>
      <Sidebar {...args} />
    </div>
  ),
}

export const WithBadges: Story = {
  args: {
    items: [
      { id: 'dashboard', label: 'DASHBOARD' },
      { id: 'repos', label: 'REPOSITORIES', badge: 12 },
      { id: 'components', label: 'COMPONENTS', badge: 279 },
      { id: 'notifications', label: 'NOTIFICATIONS', badge: 3 },
      { id: 'settings', label: 'SETTINGS' },
    ],
    onItemClick: fn(),
  },
  render: (args) => (
    <div style={{ height: '400px' }}>
      <Sidebar {...args} />
    </div>
  ),
}
