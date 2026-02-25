// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { DonutChart, MetricDonutChart, ProgressDonutChart } from '../../charts/donut-chart'

const sampleData = [
  { label: 'Desktop', value: 65, color: 'var(--color-chart-1)' },
  { label: 'Mobile', value: 35, color: 'var(--color-chart-2)' },
]

describe('DonutChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<DonutChart data={sampleData} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<DonutChart data={sampleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<DonutChart data={[]} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders center content when provided', () => {
    render(
      <DonutChart
        data={sampleData}
        centerContent={<span>100</span>}
      />
    )
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders legend items', () => {
    render(<DonutChart data={sampleData} showLegend />)
    expect(screen.getByText(/Desktop/)).toBeInTheDocument()
    expect(screen.getByText(/Mobile/)).toBeInTheDocument()
  })

  it('calls onSegmentClick when a legend item is clicked', async () => {
    const onClick = vi.fn()
    const { user } = render(
      <DonutChart data={sampleData} showLegend onSegmentClick={onClick} />
    )
    const legendItem = screen.getByLabelText(/Desktop/)
    await user.click(legendItem)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('MetricDonutChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <MetricDonutChart
        data={sampleData}
        metric={{ value: '100', label: 'TOTAL' }}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders metric value and label', () => {
    render(
      <MetricDonutChart
        data={sampleData}
        metric={{ value: '100', label: 'TOTAL', sublabel: 'users' }}
      />
    )
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
    expect(screen.getByText('users')).toBeInTheDocument()
  })
})

describe('ProgressDonutChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ProgressDonutChart value={73} max={100} label="CPU" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders percentage value', () => {
    render(<ProgressDonutChart value={73} max={100} />)
    expect(screen.getByText('73%')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<ProgressDonutChart value={50} label="PROGRESS" />)
    expect(screen.getByText('PROGRESS')).toBeInTheDocument()
  })

  it('clamps value at 100%', () => {
    render(<ProgressDonutChart value={150} max={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
