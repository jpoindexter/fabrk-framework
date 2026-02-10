// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { SystemHealthWidget } from '../../admin/system-health'

describe('SystemHealthWidget', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<SystemHealthWidget />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the system health heading', () => {
    render(<SystemHealthWidget />)
    expect(screen.getByText('SYSTEM HEALTH')).toBeInTheDocument()
  })

  it('renders all metric labels', () => {
    render(<SystemHealthWidget />)
    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
    expect(screen.getByText('Error Rate')).toBeInTheDocument()
    expect(screen.getByText('Requests/min')).toBeInTheDocument()
  })

  it('shows healthy status when all metrics are healthy', () => {
    render(
      <SystemHealthWidget
        uptime={99.9}
        avgResponseTime={100}
        errorRate={0.1}
        requestsPerMinute={1000}
      />
    )
    expect(screen.getByText('HEALTHY')).toBeInTheDocument()
  })

  it('shows warning status when uptime is in warning range', () => {
    render(
      <SystemHealthWidget
        uptime={99.2}
        avgResponseTime={100}
        errorRate={0.1}
      />
    )
    expect(screen.getByText('WARNING')).toBeInTheDocument()
  })

  it('shows critical status when error rate is critical', () => {
    render(
      <SystemHealthWidget
        uptime={99.9}
        avgResponseTime={100}
        errorRate={5.0}
      />
    )
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('displays uptime percentage', () => {
    render(<SystemHealthWidget uptime={99.95} />)
    expect(screen.getByText('99.95%')).toBeInTheDocument()
  })

  it('displays response time with ms suffix', () => {
    render(<SystemHealthWidget avgResponseTime={250} />)
    expect(screen.getByText('250ms')).toBeInTheDocument()
  })

  it('displays requests per minute formatted', () => {
    render(<SystemHealthWidget requestsPerMinute={2500} />)
    expect(screen.getByText('2,500')).toBeInTheDocument()
  })
})
