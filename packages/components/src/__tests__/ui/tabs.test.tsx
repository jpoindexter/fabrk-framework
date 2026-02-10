// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs'

function TestTabs({ defaultValue = 'tab1' }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="tab1">OVERVIEW</TabsTrigger>
        <TabsTrigger value="tab2">SETTINGS</TabsTrigger>
        <TabsTrigger value="tab3">BILLING</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Overview content here</TabsContent>
      <TabsContent value="tab2">Settings content here</TabsContent>
      <TabsContent value="tab3">Billing content here</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TestTabs />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the tab list with all triggers', () => {
    render(<TestTabs />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'OVERVIEW' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'SETTINGS' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'BILLING' })).toBeInTheDocument()
  })

  it('shows content for the default active tab', () => {
    render(<TestTabs defaultValue="tab1" />)
    expect(screen.getByText('Overview content here')).toBeInTheDocument()
  })

  it('activates a tab on click and shows corresponding content', async () => {
    const { user } = render(<TestTabs />)
    await user.click(screen.getByRole('tab', { name: 'SETTINGS' }))
    expect(screen.getByText('Settings content here')).toBeInTheDocument()
    // The previous tab content should be hidden
    expect(screen.queryByText('Overview content here')).not.toBeInTheDocument()
  })

  it('marks the active tab with data-state=active', async () => {
    const { user } = render(<TestTabs />)
    const overviewTab = screen.getByRole('tab', { name: 'OVERVIEW' })
    expect(overviewTab).toHaveAttribute('data-state', 'active')
    await user.click(screen.getByRole('tab', { name: 'BILLING' }))
    expect(overviewTab).toHaveAttribute('data-state', 'inactive')
    expect(screen.getByRole('tab', { name: 'BILLING' })).toHaveAttribute('data-state', 'active')
  })
})
