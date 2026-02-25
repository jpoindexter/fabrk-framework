// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { PieChart } from '../../charts/pie-chart'

const sampleData = [
  { label: 'Chrome', value: 65 },
  { label: 'Firefox', value: 20 },
  { label: 'Safari', value: 15 },
]

describe('PieChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<PieChart data={sampleData} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<PieChart data={sampleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG path segments for each data item', () => {
    const { container } = render(<PieChart data={sampleData} />)
    const paths = container.querySelectorAll('svg path')
    expect(paths.length).toBeGreaterThanOrEqual(sampleData.length)
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<PieChart data={[]} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders legend when showLegend is true', () => {
    render(<PieChart data={sampleData} showLegend />)
    expect(screen.getByText(/Chrome/)).toBeInTheDocument()
    expect(screen.getByText(/Firefox/)).toBeInTheDocument()
    expect(screen.getByText(/Safari/)).toBeInTheDocument()
  })

  it('hides legend when showLegend is false', () => {
    render(<PieChart data={sampleData} showLegend={false} />)
    expect(screen.queryByText(/Chrome/)).not.toBeInTheDocument()
  })

  it('calls onSegmentClick when a legend item is clicked', async () => {
    const onClick = vi.fn()
    const { user } = render(
      <PieChart data={sampleData} showLegend onSegmentClick={onClick} />
    )
    const legendItem = screen.getByLabelText(/Chrome/)
    await user.click(legendItem)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Chrome', value: 65 }),
      0
    )
  })

  it('shows percentages in legend by default', () => {
    render(<PieChart data={sampleData} showLegend showPercentages />)
    // Chrome is 65/100 = 65.0%
    expect(screen.getByText(/65\.0%/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PieChart data={sampleData} className="custom-pie" />
    )
    expect(container.firstChild).toHaveClass('custom-pie')
  })
})
