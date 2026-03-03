// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '../test-utils'
import React from 'react'
import { ErrorBoundary, useErrorHandler } from '../../ui/error-boundary'

// Component that throws on render when `shouldThrow` is true
function BombComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Boom!')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  // Suppress expected React error logs during boundary tests
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeDefined()
  })

  it('renders default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeDefined()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('calls onError callback when child throws', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(onError).toHaveBeenCalledOnce()
    const [error] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Boom!')
  })

  it('resets when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={[1]}>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    // Boundary should be in error state
    expect(screen.getByText('Something went wrong')).toBeDefined()

    // Rerender with changed resetKeys and non-throwing child
    rerender(
      <ErrorBoundary resetKeys={[2]}>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeDefined()
  })
})

describe('useErrorHandler', () => {
  it('does not throw when no error passed', () => {
    function Safe() {
      useErrorHandler(undefined)
      return <div>safe</div>
    }
    render(
      <ErrorBoundary>
        <Safe />
      </ErrorBoundary>
    )
    expect(screen.getByText('safe')).toBeDefined()
  })
})
