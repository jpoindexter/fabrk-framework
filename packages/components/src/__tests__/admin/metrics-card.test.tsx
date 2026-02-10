// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AdminMetricsCard } from '../../admin/metrics-card'

describe('AdminMetricsCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AdminMetricsCard title="TOTAL USERS" value={1234} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders value and title', () => {
    render(<AdminMetricsCard title="TOTAL USERS" value={1234} />)
    expect(screen.getByText('TOTAL USERS')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('renders string values as-is', () => {
    render(<AdminMetricsCard title="REVENUE" value="$12,500" />)
    expect(screen.getByText('$12,500')).toBeInTheDocument()
  })

  it('shows positive trend percentage', () => {
    render(<AdminMetricsCard title="USERS" value={500} change={12.5} />)
    expect(screen.getByText('12.5%')).toBeInTheDocument()
    expect(screen.getByText('vs last period')).toBeInTheDocument()
  })

  it('shows negative trend percentage', () => {
    render(<AdminMetricsCard title="ERRORS" value={50} change={-3.2} />)
    expect(screen.getByText('3.2%')).toBeInTheDocument()
  })

  it('shows custom change label', () => {
    render(<AdminMetricsCard title="MRR" value="$8,000" change={5} changeLabel="vs last month" />)
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('does not show trend when change is undefined', () => {
    render(<AdminMetricsCard title="COUNT" value={100} />)
    expect(screen.queryByText('vs last period')).not.toBeInTheDocument()
  })

  it('shows loading skeleton when loading is true', () => {
    render(<AdminMetricsCard title="LOADING" value={0} loading />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
