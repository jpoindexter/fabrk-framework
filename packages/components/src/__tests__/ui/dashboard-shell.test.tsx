// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { DashboardShell } from '../../ui/dashboard-shell'

const defaultItems = [
  { id: 'overview', label: 'Overview', href: '/dashboard' },
  { id: 'repos', label: 'Repos', href: '/dashboard/repos' },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
]

const defaultUser = {
  name: 'Jason',
  email: 'jason@example.com',
  tier: 'pro',
}

describe('DashboardShell', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <DashboardShell sidebarItems={defaultItems}>
        <div>Content</div>
      </DashboardShell>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders children content', () => {
    render(
      <DashboardShell sidebarItems={defaultItems}>
        <div>Dashboard Content</div>
      </DashboardShell>
    )
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })

  it('renders sidebar items', () => {
    render(
      <DashboardShell sidebarItems={defaultItems}>
        <div>Content</div>
      </DashboardShell>
    )
    // Labels are rendered with CSS uppercase, but DOM text is original case
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Repos').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the default title', () => {
    render(
      <DashboardShell sidebarItems={defaultItems}>
        <div>Content</div>
      </DashboardShell>
    )
    // Title appears in sidebar header and mobile header
    const titles = screen.getAllByText('Dashboard')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders custom title', () => {
    render(
      <DashboardShell sidebarItems={defaultItems} title="Admin Panel">
        <div>Content</div>
      </DashboardShell>
    )
    const titles = screen.getAllByText('Admin Panel')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders user info when provided', () => {
    render(
      <DashboardShell sidebarItems={defaultItems} user={defaultUser}>
        <div>Content</div>
      </DashboardShell>
    )
    expect(screen.getByText('Jason')).toBeInTheDocument()
  })

  it('renders user avatar initial when no image', () => {
    render(
      <DashboardShell sidebarItems={defaultItems} user={defaultUser}>
        <div>Content</div>
      </DashboardShell>
    )
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('calls onSignOut when sign out button is clicked', async () => {
    const onSignOut = vi.fn()
    const { user } = render(
      <DashboardShell sidebarItems={defaultItems} user={defaultUser} onSignOut={onSignOut}>
        <div>Content</div>
      </DashboardShell>
    )
    const signOutButton = screen.getByLabelText('Sign out')
    await user.click(signOutButton)
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('calls onItemClick when a sidebar item is clicked', async () => {
    const onItemClick = vi.fn()
    const { user } = render(
      <DashboardShell sidebarItems={defaultItems} onItemClick={onItemClick}>
        <div>Content</div>
      </DashboardShell>
    )
    const overviewElements = screen.getAllByText('Overview')
    await user.click(overviewElements[0])
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'overview', label: 'Overview' })
    )
  })

  it('highlights active item', () => {
    render(
      <DashboardShell sidebarItems={defaultItems} activeItemId="repos">
        <div>Content</div>
      </DashboardShell>
    )
    const reposElements = screen.getAllByText('Repos')
    const reposLink = reposElements[0].closest('a, button')
    expect(reposLink).toHaveClass('bg-primary')
  })

  it('renders logo when provided', () => {
    render(
      <DashboardShell
        sidebarItems={defaultItems}
        logo={<span data-testid="logo">#</span>}
      >
        <div>Content</div>
      </DashboardShell>
    )
    expect(screen.getAllByTestId('logo').length).toBeGreaterThanOrEqual(1)
  })

  it('renders badges on sidebar items', () => {
    const itemsWithBadge = [
      { id: 'inbox', label: 'Inbox', badge: 5 },
    ]
    render(
      <DashboardShell sidebarItems={itemsWithBadge}>
        <div>Content</div>
      </DashboardShell>
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
