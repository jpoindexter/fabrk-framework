// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { OrgSwitcher, OrgSwitcherOrganization } from '../../organization/org-switcher'

const organizations: OrgSwitcherOrganization[] = [
  { id: 'org-1', name: 'Acme Corp', slug: 'acme', role: 'owner' },
  { id: 'org-2', name: 'Startup Inc', slug: 'startup', role: 'member' },
  { id: 'org-3', name: 'Dev Agency', slug: 'dev-agency', role: 'admin' },
]

describe('OrgSwitcher', () => {
  const defaultProps = {
    organizations,
    currentOrgId: 'org-1',
    onSwitchOrg: vi.fn(),
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<OrgSwitcher {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the current organization name', () => {
    render(<OrgSwitcher {...defaultProps} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders the trigger button with combobox role', () => {
    render(<OrgSwitcher {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows organizations when dropdown is opened', async () => {
    const { user } = render(<OrgSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByText('Startup Inc')).toBeInTheDocument()
    expect(screen.getByText('Dev Agency')).toBeInTheDocument()
  })

  it('calls onSwitchOrg callback when an organization is selected', async () => {
    const onSwitchOrg = vi.fn()
    const { user } = render(<OrgSwitcher {...defaultProps} onSwitchOrg={onSwitchOrg} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Startup Inc'))

    expect(onSwitchOrg).toHaveBeenCalledWith('org-2')
  })

  it('shows loading state', () => {
    render(<OrgSwitcher {...defaultProps} loading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows create organization button when no organizations exist', () => {
    const onCreateOrg = vi.fn()
    render(
      <OrgSwitcher
        organizations={[]}
        currentOrgId=""
        onSwitchOrg={vi.fn()}
        onCreateOrg={onCreateOrg}
      />
    )
    expect(screen.getByText('Create Organization')).toBeInTheDocument()
  })

  it('shows create organization option in dropdown when onCreateOrg is provided', async () => {
    const onCreateOrg = vi.fn()
    const { user } = render(<OrgSwitcher {...defaultProps} onCreateOrg={onCreateOrg} />)

    await user.click(screen.getByRole('combobox'))
    // The "Create Organization" menu item should appear in the dropdown
    const createItems = screen.getAllByText('Create Organization')
    expect(createItems.length).toBeGreaterThanOrEqual(1)
  })
})
