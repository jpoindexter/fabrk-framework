import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { DashboardShell } from './dashboard-shell'

const meta = {
  title: 'Layout/DashboardShell',
  component: DashboardShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DashboardShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ height: '500px' }}>
      <DashboardShell
        sidebarItems={[
          { id: 'overview', label: 'Overview', href: '/dashboard', active: true },
          { id: 'repos', label: 'Repos', href: '/dashboard/repos', badge: 12 },
          { id: 'components', label: 'Components', href: '/dashboard/components', badge: 279 },
          { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
          { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
        ]}
        user={{ name: 'Jason', email: 'jason@fabrk.dev', tier: 'pro' }}
        logo={<span style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>#</span>}
        title="FABRK"
        activeItemId="overview"
        onItemClick={fn()}
        onSignOut={fn()}
      >
        <div style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>OVERVIEW</h2>
          <p style={{ color: 'var(--color-muted-foreground)' }}>
            Dashboard content goes here. This shell provides sidebar navigation, user info, and responsive layout.
          </p>
        </div>
      </DashboardShell>
    </div>
  ),
}
