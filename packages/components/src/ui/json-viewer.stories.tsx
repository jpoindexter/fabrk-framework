import type { Meta, StoryObj } from '@storybook/react'
import { JsonViewer } from './json-viewer'

const meta = {
  title: 'Terminal/JsonViewer',
  component: JsonViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof JsonViewer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    data: {
      name: 'FABRK Framework',
      version: '1.0.0',
      packages: 16,
      published: true,
    },
    defaultExpandDepth: 1,
  },
}

export const Nested: Story = {
  args: {
    data: {
      user: {
        id: 'usr_abc123',
        name: 'Jason',
        email: 'jason@fabrk.dev',
        roles: ['admin', 'developer'],
        settings: {
          theme: 'terminal-dark',
          notifications: true,
          mfa: {
            enabled: true,
            method: 'totp',
          },
        },
      },
      meta: {
        timestamp: '2025-01-15T10:00:00Z',
        requestId: 'req_xyz789',
      },
    },
    defaultExpandDepth: 2,
  },
}

export const ArrayData: Story = {
  args: {
    data: [
      { id: 1, status: 'active', label: 'Project Alpha' },
      { id: 2, status: 'archived', label: 'Project Beta' },
      { id: 3, status: 'active', label: 'Project Gamma' },
    ],
    defaultExpandDepth: 1,
  },
}

export const Collapsed: Story = {
  args: {
    data: {
      config: { theme: 'dark', lang: 'en' },
      features: ['auth', 'payments', 'ai'],
      count: 42,
      active: true,
      empty: null,
    },
    defaultExpandDepth: 0,
  },
}
