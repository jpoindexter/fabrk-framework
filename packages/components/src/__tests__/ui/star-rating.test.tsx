import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { StarRating } from '../../ui/star-rating'

describe('StarRating', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<StarRating value={3} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the correct number of stars (default 5)', () => {
    render(<StarRating value={0} />)
    const stars = screen.getAllByRole('radio')
    expect(stars).toHaveLength(5)
  })

  it('renders a custom number of stars when max is set', () => {
    render(<StarRating value={0} max={10} />)
    const stars = screen.getAllByRole('radio')
    expect(stars).toHaveLength(10)
  })

  it('marks the correct stars as checked based on value', () => {
    render(<StarRating value={3} />)
    const stars = screen.getAllByRole('radio')
    expect(stars[0]).toHaveAttribute('aria-checked', 'true')
    expect(stars[1]).toHaveAttribute('aria-checked', 'true')
    expect(stars[2]).toHaveAttribute('aria-checked', 'true')
    expect(stars[3]).toHaveAttribute('aria-checked', 'false')
    expect(stars[4]).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the correct value when a star is clicked', async () => {
    const onChange = vi.fn()
    const { user } = render(<StarRating value={0} onChange={onChange} />)
    const stars = screen.getAllByRole('radio')
    await user.click(stars[3]) // 4th star = value 4
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('does not call onChange when readonly', async () => {
    const onChange = vi.fn()
    const { user } = render(<StarRating value={2} onChange={onChange} readonly />)
    const stars = screen.getAllByRole('radio')
    await user.click(stars[4])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables all star buttons in readonly mode', () => {
    render(<StarRating value={3} readonly />)
    const stars = screen.getAllByRole('radio')
    stars.forEach((star) => {
      expect(star).toBeDisabled()
    })
  })

  it('has correct aria-labels on each star', () => {
    render(<StarRating value={0} />)
    expect(screen.getByLabelText('1 star')).toBeInTheDocument()
    expect(screen.getByLabelText('2 stars')).toBeInTheDocument()
    expect(screen.getByLabelText('5 stars')).toBeInTheDocument()
  })
})
