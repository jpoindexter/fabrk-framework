// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { DashboardHeader } from '../../ui/dashboard-header'

describe('DashboardHeader', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<DashboardHeader title="Repositories" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders title', () => {
    render(<DashboardHeader title="Repositories" />)
    expect(screen.getByText('Repositories')).toBeInTheDocument()
  })

  it('renders title with code prefix in terminal style', () => {
    render(<DashboardHeader title="Dashboard" code="0xA1" />)
    expect(screen.getByText('[ [0xA1] Dashboard ]')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<DashboardHeader title="Overview" subtitle="3 connected" />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('3 connected')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<DashboardHeader title="Overview" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('renders actions when provided', () => {
    render(
      <DashboardHeader
        title="Repositories"
        actions={<button>Add Repo</button>}
      />
    )
    expect(screen.getByText('Add Repo')).toBeInTheDocument()
  })

  it('does not render actions area when no actions', () => {
    const { container } = render(<DashboardHeader title="Overview" />)
    // Only the header and title div should exist
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    // No actions div
    expect(header?.children.length).toBe(1)
  })

  it('applies custom className', () => {
    const { container } = render(
      <DashboardHeader title="Test" className="custom-header" />
    )
    expect(container.querySelector('header')).toHaveClass('custom-header')
  })

  it('renders as a header element', () => {
    const { container } = render(<DashboardHeader title="Test" />)
    expect(container.querySelector('header')).toBeInTheDocument()
  })

  it('renders title as h1', () => {
    render(<DashboardHeader title="Main Page" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Main Page')
  })
})
