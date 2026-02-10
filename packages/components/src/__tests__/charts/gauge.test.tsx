// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Gauge, ScoreGauge } from '../../charts/gauge'

describe('Gauge', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Gauge value={73} max={100} label="CPU" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<Gauge value={73} max={100} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays the value by default', () => {
    render(<Gauge value={73} max={100} />)
    expect(screen.getByText('73')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(<Gauge value={73} max={100} label="CPU USAGE" />)
    expect(screen.getByText('CPU USAGE')).toBeInTheDocument()
  })

  it('displays unit when provided', () => {
    render(<Gauge value={73} max={100} unit="%" />)
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('hides value when showValue is false', () => {
    render(<Gauge value={73} max={100} showValue={false} />)
    expect(screen.queryByText('73')).not.toBeInTheDocument()
  })

  it('clamps value within min/max range', () => {
    render(<Gauge value={150} min={0} max={100} />)
    // Value should be clamped to 100
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('clamps value at minimum', () => {
    render(<Gauge value={-10} min={0} max={100} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders SVG elements for arc and needle', () => {
    const { container } = render(<Gauge value={50} max={100} />)
    // Background arc, value arc, needle polygon, center circle
    expect(container.querySelector('.gauge-background')).toBeInTheDocument()
    expect(container.querySelector('.gauge-value')).toBeInTheDocument()
    expect(container.querySelector('.gauge-needle')).toBeInTheDocument()
    expect(container.querySelector('.gauge-center')).toBeInTheDocument()
  })

  it('renders segments when provided', () => {
    const segments = [
      { value: 30, color: 'red' },
      { value: 40, color: 'yellow' },
      { value: 30, color: 'green' },
    ]
    const { container } = render(
      <Gauge value={50} max={100} segments={segments} />
    )
    const segmentPaths = container.querySelectorAll('.gauge-segment')
    expect(segmentPaths.length).toBe(3)
  })

  it('applies custom className', () => {
    const { container } = render(
      <Gauge value={50} max={100} className="custom-gauge" />
    )
    expect(container.firstChild).toHaveClass('custom-gauge')
  })
})

describe('ScoreGauge', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ScoreGauge score={85} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders without crashing', () => {
    const { container } = render(<ScoreGauge score={85} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays the score value', () => {
    render(<ScoreGauge score={85} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(<ScoreGauge score={85} label="HEALTH SCORE" />)
    expect(screen.getByText('HEALTH SCORE')).toBeInTheDocument()
  })
})
