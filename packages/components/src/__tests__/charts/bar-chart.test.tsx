// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, axe } from '../test-utils'
import React from 'react'
import { BarChart, BarChartCard, StackedBarChart } from '../../charts/bar-chart'

const sampleData = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 200 },
  { label: 'Mar', value: 150 },
]

const series = [{ dataKey: 'value', name: 'Revenue' }]

describe('BarChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <BarChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <BarChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(
      <BarChart data={[]} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders with multiple series', () => {
    const multiData = [
      { month: 'Jan', revenue: 4000, costs: 2400 },
      { month: 'Feb', revenue: 3000, costs: 1398 },
    ]
    const multiSeries = [
      { dataKey: 'revenue', name: 'Revenue' },
      { dataKey: 'costs', name: 'Costs' },
    ]
    const { container } = render(
      <BarChart data={multiData} xAxisKey="month" series={multiSeries} showLegend />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <BarChart data={sampleData} xAxisKey="label" series={series} className="custom-chart" />
    )
    expect(container.firstChild).toHaveClass('custom-chart')
  })

  it('renders in horizontal layout', () => {
    const { container } = render(
      <BarChart data={sampleData} xAxisKey="label" series={series} horizontal />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})

describe('BarChartCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <BarChartCard
        title="Revenue"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders card title in terminal style', () => {
    const { container } = render(
      <BarChartCard
        title="Revenue"
        code="0xB1"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('[0xB1] REVENUE')
  })

  it('renders description when provided', () => {
    const { container } = render(
      <BarChartCard
        title="Revenue"
        description="Monthly breakdown"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('Monthly breakdown')
  })
})

describe('StackedBarChart', () => {
  it('renders without crashing', () => {
    const stackData = [
      { month: 'Jan', desktop: 300, mobile: 200 },
      { month: 'Feb', desktop: 400, mobile: 250 },
    ]
    const { container } = render(
      <StackedBarChart
        data={stackData}
        xAxisKey="month"
        stackKeys={['desktop', 'mobile']}
        stackLabels={['Desktop', 'Mobile']}
      />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
