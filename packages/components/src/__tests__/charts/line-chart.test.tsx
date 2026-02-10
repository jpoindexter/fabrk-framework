// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, axe } from '../test-utils'
import React from 'react'
import { LineChart, LineChartCard } from '../../charts/line-chart'

const sampleData = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 200 },
  { label: 'Mar', value: 150 },
]

const series = [{ dataKey: 'value', name: 'Trend' }]

describe('LineChart', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <LineChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <LineChart data={sampleData} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(
      <LineChart data={[]} xAxisKey="label" series={series} />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders with multiple series', () => {
    const multiData = [
      { date: 'Mon', users: 120, sessions: 340 },
      { date: 'Tue', users: 180, sessions: 420 },
    ]
    const multiSeries = [
      { dataKey: 'users', name: 'Users' },
      { dataKey: 'sessions', name: 'Sessions', dashed: true },
    ]
    const { container } = render(
      <LineChart data={multiData} xAxisKey="date" series={multiSeries} showLegend />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <LineChart data={sampleData} xAxisKey="label" series={series} className="custom-line" />
    )
    expect(container.firstChild).toHaveClass('custom-line')
  })
})

describe('LineChartCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <LineChartCard
        title="Trend"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders card title in terminal style', () => {
    const { container } = render(
      <LineChartCard
        title="Trend"
        code="0xL1"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('[0xL1] TREND')
  })

  it('renders description when provided', () => {
    const { container } = render(
      <LineChartCard
        title="Trend"
        description="Weekly overview"
        data={sampleData}
        xAxisKey="label"
        series={series}
      />
    )
    expect(container.textContent).toContain('Weekly overview')
  })
})
