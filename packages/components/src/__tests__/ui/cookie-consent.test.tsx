import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { CookieConsent } from '../../ui/cookie-consent'

describe('CookieConsent', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('has no accessibility violations when visible', async () => {
    // No stored consent means the banner shows
    const { container } = render(<CookieConsent />)
    // Need to wait for useEffect to run and set hasConsented=false
    // The component defaults hasConsented=true, then flips in useEffect
    // We need to ensure it renders
    await vi.waitFor(() => {
      expect(screen.getByText('[ COOKIE PREFERENCES ]')).toBeInTheDocument()
    })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the banner when no consent has been stored', async () => {
    render(<CookieConsent />)
    await vi.waitFor(() => {
      expect(screen.getByText('[ COOKIE PREFERENCES ]')).toBeInTheDocument()
    })
    expect(screen.getByText('ACCEPT ALL')).toBeInTheDocument()
    expect(screen.getByText('ACCEPT SELECTED')).toBeInTheDocument()
    expect(screen.getByText('REJECT ALL')).toBeInTheDocument()
  })

  it('does not render when consent has already been stored', () => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({ necessary: true, preferences: true, statistics: false, marketing: false })
    )
    render(<CookieConsent />)
    expect(screen.queryByText('[ COOKIE PREFERENCES ]')).not.toBeInTheDocument()
  })

  it('renders category checkboxes for preferences, statistics, marketing', async () => {
    render(<CookieConsent />)
    await vi.waitFor(() => {
      expect(screen.getByText('PREFERENCES')).toBeInTheDocument()
    })
    expect(screen.getByText('STATISTICS')).toBeInTheDocument()
    expect(screen.getByText('MARKETING')).toBeInTheDocument()
  })

  it('calls onAcceptAll with all categories enabled', async () => {
    const onAcceptAll = vi.fn()
    const { user } = render(<CookieConsent onAcceptAll={onAcceptAll} />)

    await vi.waitFor(() => {
      expect(screen.getByText('ACCEPT ALL')).toBeInTheDocument()
    })

    await user.click(screen.getByText('ACCEPT ALL'))

    expect(onAcceptAll).toHaveBeenCalledWith({
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true,
    })
  })

  it('calls onRejectAll with only necessary enabled', async () => {
    const onRejectAll = vi.fn()
    const { user } = render(<CookieConsent onRejectAll={onRejectAll} />)

    await vi.waitFor(() => {
      expect(screen.getByText('REJECT ALL')).toBeInTheDocument()
    })

    await user.click(screen.getByText('REJECT ALL'))

    expect(onRejectAll).toHaveBeenCalledWith({
      necessary: true,
      preferences: false,
      statistics: false,
      marketing: false,
    })
  })

  it('allows toggling individual cookie categories', async () => {
    const onAcceptSelected = vi.fn()
    const { user } = render(<CookieConsent onAcceptSelected={onAcceptSelected} />)

    await vi.waitFor(() => {
      expect(screen.getByText('STATISTICS')).toBeInTheDocument()
    })

    // Toggle statistics checkbox on
    const label = screen.getByText('STATISTICS').closest('label')
    const statisticsCheckbox = label?.querySelector('input') as HTMLInputElement
    await user.click(statisticsCheckbox)

    // Click accept selected
    await user.click(screen.getByText('ACCEPT SELECTED'))

    expect(onAcceptSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        necessary: true,
        statistics: true,
      })
    )
  })

  it('hides the banner after accepting', async () => {
    const { user } = render(<CookieConsent onAcceptAll={vi.fn()} />)

    await vi.waitFor(() => {
      expect(screen.getByText('ACCEPT ALL')).toBeInTheDocument()
    })

    await user.click(screen.getByText('ACCEPT ALL'))

    // Banner should disappear
    expect(screen.queryByText('[ COOKIE PREFERENCES ]')).not.toBeInTheDocument()
  })
})
