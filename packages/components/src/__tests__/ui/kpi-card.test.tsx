// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { KpiCard } from '../../ui/kpi-card'

describe('KpiCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<KpiCard title="Revenue" value="$45,231" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders title and value', () => {
    render(<KpiCard title="Revenue" value="$45,231" />)
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$45,231')).toBeInTheDocument()
  })

  it('renders numeric value', () => {
    render(<KpiCard title="Users" value={500} />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('shows up trend with change percentage', () => {
    render(<KpiCard title="Revenue" value="$45,231" change={12} trend="up" />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('shows down trend with change percentage', () => {
    render(<KpiCard title="Revenue" value="$30,000" change={-8} trend="down" />)
    expect(screen.getByText('8%')).toBeInTheDocument()
  })

  it('shows neutral trend', () => {
    render(<KpiCard title="Revenue" value="$45,231" change={0} trend="neutral" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<KpiCard title="Revenue" value="$45,231" subtitle="vs last month" />)
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('renders both change and subtitle together', () => {
    render(
      <KpiCard
        title="Revenue"
        value="$45,231"
        change={12}
        trend="up"
        subtitle="vs last month"
      />
    )
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('does not render change section when no change or subtitle', () => {
    const { container } = render(<KpiCard title="Revenue" value="$45,231" />)
    // The kpi card should not have the change/subtitle row
    const changeElements = container.querySelectorAll('[data-slot="kpi-card"] .flex.items-center.gap-2.text-xs')
    expect(changeElements.length).toBe(0)
  })

  it('renders icon when provided', () => {
    render(
      <KpiCard
        title="Revenue"
        value="$45,231"
        icon={<span data-testid="kpi-icon">$</span>}
      />
    )
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <KpiCard title="Revenue" value="$45,231" className="custom-kpi" />
    )
    expect(container.querySelector('[data-slot="kpi-card"]')).toHaveClass('custom-kpi')
  })
})
