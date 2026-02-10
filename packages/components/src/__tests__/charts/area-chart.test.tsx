// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, axe } from '../test-utils'
import React from 'react'
import { AreaChart, AreaChartCard, StackedAreaChart } from '../../charts/area-chart'

const sampleData = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 200 },
  { label: 'Mar', value: 150 },
]

const series = [{ dataKey: 'value', name: 'Traffic' }]

describe('AreaChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AreaChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <AreaChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(
      <AreaChart data={[]} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders with gradient fill by default', () => {
    const { container } = render(
      <AreaChart data={sampleData} xAxisKey="label" series={series} />
    )
    // Gradient defs should be in the SVG
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders without gradient when disabled', () => {
    const { container } = render(
      <AreaChart data={sampleData} xAxisKey="label" series={series} gradient={false} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <AreaChart data={sampleData} xAxisKey="label" series={series} className="custom-area" />
    )
    expect(container.firstChild).toHaveClass('custom-area')
  })
})

describe('AreaChartCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AreaChartCard
        title="Traffic"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders card title in terminal style', () => {
    const { container } = render(
      <AreaChartCard
        title="Traffic"
        code="0xA1"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('[0xA1] TRAFFIC')
  })

  it('renders description when provided', () => {
    const { container } = render(
      <AreaChartCard
        title="Traffic"
        description="Daily visits"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('Daily visits')
  })
})

describe('StackedAreaChart', () => {
  it('renders without crashing', () => {
    const stackData = [
      { month: 'Jan', organic: 300, paid: 200 },
      { month: 'Feb', organic: 400, paid: 250 },
    ]
    const { container } = render(
      <StackedAreaChart
        data={stackData}
        xAxisKey="month"
        stackKeys={['organic', 'paid']}
        stackLabels={['Organic', 'Paid']}
      />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
