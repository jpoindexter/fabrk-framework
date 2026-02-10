// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Button } from '../../ui/button'

describe('Button', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Button>SUBMIT</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('fires click handler when clicked', async () => {
    const onClick = vi.fn()
    const { user } = render(<Button onClick={onClick}>{'> SAVE'}</Button>)
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows spinner and disables when loading', () => {
    render(<Button loading>SAVE</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    // Loading state replaces children with loadingText
    expect(screen.getByText('> LOADING...')).toBeInTheDocument()
  })

  it('uses custom loadingText when provided', () => {
    render(<Button loading loadingText="> SAVING...">SAVE</Button>)
    expect(screen.getByText('> SAVING...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '> SAVING...')
  })

  it('respects disabled state and does not fire click', async () => {
    const onClick = vi.fn()
    const { user } = render(<Button disabled onClick={onClick}>DISABLED</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders different variants without crashing', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument()
      unmount()
    })
  })
})
