// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'

import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { KpiCard } from '../ui/kpi-card'
import { StatsGrid } from '../ui/stats-grid'
import { EmptyState } from '../ui/empty-state'
import { Progress } from '../ui/progress'
import { StarRating } from '../ui/star-rating'
import { Tag } from '../ui/tag'
import { StatusPulse } from '../ui/status-pulse'
import { TierBadge } from '../ui/tier-badge'
import { DashboardHeader } from '../ui/dashboard-header'
import { ASCIIProgressBar } from '../ui/ascii-progress-bar'
import { CodeBlock } from '../ui/code-block'

describe('SSR Smoke Tests', () => {
  it('Button renders to string', () => {
    const html = renderToString(React.createElement(Button, null, '> SUBMIT'))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('Card renders to string', () => {
    const html = renderToString(React.createElement(Card, null, 'Card content'))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('Badge renders to string', () => {
    const html = renderToString(React.createElement(Badge, null, 'NEW'))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('Input renders to string', () => {
    const html = renderToString(React.createElement(Input, { placeholder: 'Enter email' }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('KpiCard renders to string', () => {
    const html = renderToString(
      React.createElement(KpiCard, { title: 'REVENUE', value: '$100', trend: 'up', change: 5 })
    )
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('StatsGrid renders to string', () => {
    const html = renderToString(
      React.createElement(StatsGrid, { items: [{ label: 'Users', value: 100 }] })
    )
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('EmptyState renders to string', () => {
    const html = renderToString(
      React.createElement(EmptyState, { title: 'NO DATA', description: 'Nothing here' })
    )
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('Progress renders to string', () => {
    const html = renderToString(React.createElement(Progress, { value: 50 }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('StarRating renders to string', () => {
    const html = renderToString(React.createElement(StarRating, { value: 3 }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('Tag renders to string', () => {
    const html = renderToString(React.createElement(Tag, null, 'TYPESCRIPT'))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('StatusPulse renders to string', () => {
    const html = renderToString(React.createElement(StatusPulse, { status: 'online' }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('TierBadge renders to string', () => {
    const html = renderToString(React.createElement(TierBadge, { tier: 'pro' }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('DashboardHeader renders to string', () => {
    const html = renderToString(React.createElement(DashboardHeader, { title: 'DASHBOARD' }))
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('AsciiProgressBar renders to string', () => {
    const html = renderToString(
      React.createElement(ASCIIProgressBar, { value: 50, max: 100 })
    )
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })

  it('CodeBlock renders to string', () => {
    const html = renderToString(
      React.createElement(CodeBlock, { code: 'const x = 1;', language: 'typescript' })
    )
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(0)
  })
})
