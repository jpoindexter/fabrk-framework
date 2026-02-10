// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Sidebar } from '../../ui/sidebar'

const defaultItems = [
  { id: 'home', label: 'Home' },
  { id: 'settings', label: 'Settings' },
  { id: 'profile', label: 'Profile' },
]

describe('Sidebar', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Sidebar items={defaultItems} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all sidebar items', () => {
    render(<Sidebar items={defaultItems} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders as an aside element', () => {
    const { container } = render(<Sidebar items={defaultItems} />)
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('renders navigation heading', () => {
    render(<Sidebar items={defaultItems} />)
    expect(screen.getByText('Navigation')).toBeInTheDocument()
  })

  it('calls onItemClick when an item is clicked', async () => {
    const onItemClick = vi.fn()
    const { user } = render(
      <Sidebar items={defaultItems} onItemClick={onItemClick} />
    )
    await user.click(screen.getByText('Home'))
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'home', label: 'Home' })
    )
  })

  it('calls item onClick handler when clicked', async () => {
    const itemOnClick = vi.fn()
    const items = [
      { id: 'home', label: 'Home', onClick: itemOnClick },
    ]
    const { user } = render(<Sidebar items={items} />)
    await user.click(screen.getByText('Home'))
    expect(itemOnClick).toHaveBeenCalledTimes(1)
  })

  it('renders badges on items', () => {
    const items = [
      { id: 'inbox', label: 'Inbox', badge: 3 },
    ]
    render(<Sidebar items={items} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders icons on items', () => {
    const items = [
      { id: 'home', label: 'Home', icon: <span data-testid="home-icon">H</span> },
    ]
    render(<Sidebar items={items} />)
    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
  })

  it('renders nested children items', async () => {
    const items = [
      {
        id: 'parent',
        label: 'Parent',
        children: [
          { id: 'child1', label: 'Child One' },
          { id: 'child2', label: 'Child Two' },
        ],
      },
    ]
    const { user } = render(<Sidebar items={items} />)
    // Children should be hidden initially
    expect(screen.queryByText('Child One')).not.toBeInTheDocument()

    // Click parent to expand
    await user.click(screen.getByText('Parent'))
    expect(screen.getByText('Child One')).toBeInTheDocument()
    expect(screen.getByText('Child Two')).toBeInTheDocument()

    // Click parent again to collapse
    await user.click(screen.getByText('Parent'))
    expect(screen.queryByText('Child One')).not.toBeInTheDocument()
  })

  it('toggles collapse/expand of sidebar', async () => {
    const { user } = render(<Sidebar items={defaultItems} />)

    // Sidebar starts expanded (w-64)
    expect(screen.getByText('Navigation')).toBeInTheDocument()

    // Click the collapse button
    const collapseBtn = screen.getByLabelText('Collapse sidebar')
    await user.click(collapseBtn)

    // After collapse, Navigation text should be hidden
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument()

    // Click expand button
    const expandBtn = screen.getByLabelText('Expand sidebar')
    await user.click(expandBtn)

    // Sidebar should be expanded again
    expect(screen.getByText('Navigation')).toBeInTheDocument()
  })

  it('starts collapsed when defaultCollapsed is true', () => {
    render(<Sidebar items={defaultItems} defaultCollapsed />)
    // When collapsed, the "Navigation" text and item labels are hidden
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Sidebar items={defaultItems} className="custom-sidebar" />
    )
    expect(container.querySelector('aside')).toHaveClass('custom-sidebar')
  })
})
