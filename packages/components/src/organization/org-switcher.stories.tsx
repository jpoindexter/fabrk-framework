import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { OrgSwitcher } from './org-switcher'

const meta = {
  title: 'Organization/OrgSwitcher',
  component: OrgSwitcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof OrgSwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    organizations: [
      { id: 'org-1', name: 'Acme Corp', slug: 'acme', role: 'owner' },
      { id: 'org-2', name: 'Startup Inc', slug: 'startup', role: 'member' },
      { id: 'org-3', name: 'DevTools LLC', slug: 'devtools', role: 'admin' },
    ],
    currentOrgId: 'org-1',
    onSwitchOrg: fn(),
    onCreateOrg: fn(),
  },
}

export const Loading: Story = {
  args: {
    organizations: [],
    loading: true,
    onSwitchOrg: fn(),
  },
}

export const Empty: Story = {
  args: {
    organizations: [],
    loading: false,
    onSwitchOrg: fn(),
    onCreateOrg: fn(),
  },
}
