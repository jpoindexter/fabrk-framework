// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { StatsGrid } from '../../ui/stats-grid'

const defaultItems = [
  { label: 'Files', value: 1572 },
  { label: 'Components', value: 279, change: '+12%' },
  { label: 'Routes', value: 46 },
  { label: 'Complexity', value: 'B+' },
]

describe('StatsGrid', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<StatsGrid items={defaultItems} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all items', () => {
    render(<StatsGrid items={defaultItems} />)
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('Routes')).toBeInTheDocument()
    expect(screen.getByText('Complexity')).toBeInTheDocument()
  })

  it('handles empty items array', () => {
    const { container } = render(<StatsGrid items={[]} />)
    // Grid renders but with no children
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild?.childNodes.length).toBe(0)
  })

  it('formats large numbers with K suffix', () => {
    render(<StatsGrid items={[{ label: 'Files', value: 1572 }]} />)
    expect(screen.getByText('1.6K')).toBeInTheDocument()
  })

  it('formats millions with M suffix', () => {
    render(<StatsGrid items={[{ label: 'Users', value: 2500000 }]} />)
    expect(screen.getByText('2.5M')).toBeInTheDocument()
  })

  it('renders small numbers without suffix', () => {
    render(<StatsGrid items={[{ label: 'Routes', value: 46 }]} />)
    expect(screen.getByText('46')).toBeInTheDocument()
  })

  it('renders string values as-is', () => {
    render(<StatsGrid items={[{ label: 'Grade', value: 'A+' }]} />)
    expect(screen.getByText('A+')).toBeInTheDocument()
  })

  it('shows change percentage when provided', () => {
    render(<StatsGrid items={defaultItems} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
  })

  it('does not render change when not provided', () => {
    render(<StatsGrid items={[{ label: 'Files', value: 100 }]} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders icons when provided', () => {
    const itemsWithIcons = [
      { label: 'Files', value: 100, icon: <span data-testid="file-icon">F</span> },
    ]
    render(<StatsGrid items={itemsWithIcons} />)
    expect(screen.getByTestId('file-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatsGrid items={defaultItems} className="custom-grid" />
    )
    expect(container.firstChild).toHaveClass('custom-grid')
  })

  it('supports different column counts', () => {
    const { container: c2 } = render(<StatsGrid items={defaultItems} columns={2} />)
    expect(c2.firstChild).toHaveClass('grid-cols-2')

    const { container: c3 } = render(<StatsGrid items={defaultItems} columns={3} />)
    expect(c3.firstChild).toHaveClass('sm:grid-cols-3')
  })
})
