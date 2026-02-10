// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { FunnelChart } from '../../charts/funnel-chart'

const sampleData = [
  { label: 'Visitors', value: 1000 },
  { label: 'Signups', value: 500 },
  { label: 'Paid', value: 150 },
]

describe('FunnelChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<FunnelChart data={sampleData} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<FunnelChart data={sampleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders all stage labels', () => {
    render(<FunnelChart data={sampleData} />)
    expect(screen.getByText('Visitors')).toBeInTheDocument()
    expect(screen.getByText('Signups')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('renders stage values when showValues is true', () => {
    render(<FunnelChart data={sampleData} showValues />)
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('hides stage values when showValues is false', () => {
    render(<FunnelChart data={sampleData} showValues={false} />)
    expect(screen.queryByText('1,000')).not.toBeInTheDocument()
  })

  it('renders conversion percentages for non-first stages', () => {
    render(<FunnelChart data={sampleData} showPercentages />)
    // Signups: 500/1000 = 50.0%
    expect(screen.getByText('50.0% conversion')).toBeInTheDocument()
    // Paid: 150/500 = 30.0%
    expect(screen.getByText('30.0% conversion')).toBeInTheDocument()
  })

  it('calls onStageClick when a stage is clicked', async () => {
    const onClick = vi.fn()
    const { user } = render(
      <FunnelChart data={sampleData} onStageClick={onClick} />
    )
    const stage = screen.getByLabelText('Visitors: 1000')
    await user.click(stage)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Visitors', value: 1000 }),
      0
    )
  })

  it('renders in horizontal direction', () => {
    const { container } = render(
      <FunnelChart data={sampleData} direction="horizontal" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <FunnelChart data={sampleData} className="custom-funnel" />
    )
    expect(container.firstChild).toHaveClass('custom-funnel')
  })

  it('handles single stage data', () => {
    const singleData = [{ label: 'Visitors', value: 1000 }]
    const { container } = render(<FunnelChart data={singleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Visitors')).toBeInTheDocument()
  })
})
