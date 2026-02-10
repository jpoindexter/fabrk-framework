// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Sparkline, SparklineCard, SparklineGroup } from '../../charts/sparkline'

const sampleData = [10, 20, 15, 25, 18]

describe('Sparkline', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Sparkline data={sampleData} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<Sparkline data={sampleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG path for the sparkline', () => {
    const { container } = render(<Sparkline data={sampleData} />)
    expect(container.querySelector('.sparkline-line')).toBeInTheDocument()
  })

  it('returns null when data has fewer than 2 points', () => {
    const { container } = render(<Sparkline data={[5]} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders area when showArea is true', () => {
    const { container } = render(<Sparkline data={sampleData} showArea />)
    expect(container.querySelector('.sparkline-area')).toBeInTheDocument()
  })

  it('does not render area by default', () => {
    const { container } = render(<Sparkline data={sampleData} />)
    expect(container.querySelector('.sparkline-area')).not.toBeInTheDocument()
  })

  it('renders dots when showDots is true', () => {
    const { container } = render(<Sparkline data={sampleData} showDots />)
    const dots = container.querySelectorAll('.sparkline-dot')
    expect(dots.length).toBe(sampleData.length)
  })

  it('does not render dots by default', () => {
    const { container } = render(<Sparkline data={sampleData} />)
    expect(container.querySelector('.sparkline-dot')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Sparkline data={sampleData} className="custom-sparkline" />
    )
    expect(container.querySelector('svg')).toHaveClass('custom-sparkline')
  })
})

describe('SparklineCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SparklineCard title="Revenue" value="$12,345" data={sampleData} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders title and value', () => {
    render(<SparklineCard title="Revenue" value="$12,345" data={sampleData} />)
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,345')).toBeInTheDocument()
  })

  it('renders change indicator when provided', () => {
    render(
      <SparklineCard
        title="Revenue"
        value="$12,345"
        data={sampleData}
        change={{ value: 12, label: 'vs last week' }}
      />
    )
    expect(screen.getByText(/\+12%/)).toBeInTheDocument()
    expect(screen.getByText(/vs last week/)).toBeInTheDocument()
  })

  it('renders negative change indicator', () => {
    render(
      <SparklineCard
        title="Revenue"
        value="$8,000"
        data={sampleData}
        change={{ value: -5 }}
      />
    )
    expect(screen.getByText(/-5%/)).toBeInTheDocument()
  })
})

describe('SparklineGroup', () => {
  const items = [
    { label: 'API Calls', value: 1200, data: [10, 20, 30, 25, 35] },
    { label: 'Errors', value: 3, data: [1, 0, 2, 0, 0] },
  ]

  it('has no accessibility violations', async () => {
    const { container } = render(<SparklineGroup items={items} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all items', () => {
    render(<SparklineGroup items={items} />)
    expect(screen.getByText('API Calls')).toBeInTheDocument()
    expect(screen.getByText('Errors')).toBeInTheDocument()
  })
})
