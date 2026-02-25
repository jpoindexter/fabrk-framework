// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Components WITHOUT dedicated test files — these are the only ones we test here
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Container } from '../ui/container'
import { EmptyState } from '../ui/empty-state'
import { LoadingSpinner, Skeleton } from '../ui/loading'

// ============================================================================
// Badge
// ============================================================================
describe('Badge', () => {
  it('renders text and supports variants', () => {
    const { rerender } = render(<Badge>NEW</Badge>)
    expect(screen.getByText('NEW')).toBeInTheDocument()

    rerender(<Badge variant="destructive">ERROR</Badge>)
    expect(screen.getByText('ERROR')).toBeInTheDocument()
  })
})

// ============================================================================
// Card
// ============================================================================
describe('Card', () => {
  it('renders Card with header and content', () => {
    render(
      <Card data-testid="card">
        <CardHeader title="CARD TITLE" meta="8 items" />
        <CardContent>Card body content</CardContent>
      </Card>
    )
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('CARD TITLE')).toBeInTheDocument()
    expect(screen.getByText('8 items')).toBeInTheDocument()
    expect(screen.getByText('Card body content')).toBeInTheDocument()
  })
})

// ============================================================================
// Label
// ============================================================================
describe('Label', () => {
  it('renders as label element with required indicator', () => {
    render(<Label required data-testid="label-test">Email</Label>)
    expect(screen.getByTestId('label-test').tagName).toBe('LABEL')
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })
})

// ============================================================================
// Container
// ============================================================================
describe('Container', () => {
  it('renders children with size prop', () => {
    render(<Container size="md" data-testid="container">Page content</Container>)
    expect(screen.getByTestId('container')).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })
})

// ============================================================================
// EmptyState
// ============================================================================
describe('EmptyState', () => {
  it('renders title, description, and action button', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="NO DATA"
        description="Nothing to display yet."
        action={{ label: 'ADD ITEM', onClick }}
      />
    )
    expect(screen.getByText('NO DATA')).toBeInTheDocument()
    expect(screen.getByText('Nothing to display yet.')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// ============================================================================
// LoadingSpinner / Skeleton
// ============================================================================
describe('LoadingSpinner', () => {
  it('renders with status role', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders with aria-hidden', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
  })
})
