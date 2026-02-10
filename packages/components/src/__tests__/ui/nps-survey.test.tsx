import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe, waitFor } from '../test-utils'
import { NPSSurvey } from '../../ui/nps-survey'

describe('NPSSurvey', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<NPSSurvey {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders default title', () => {
    render(<NPSSurvey {...defaultProps} />)
    expect(screen.getByText('How likely are you to recommend us?')).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<NPSSurvey {...defaultProps} title="Rate our service" />)
    expect(screen.getByText('Rate our service')).toBeInTheDocument()
  })

  it('renders score buttons 0-10', () => {
    render(<NPSSurvey {...defaultProps} />)
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('shows feedback textarea and submit button after selecting a score', async () => {
    const { user } = render(<NPSSurvey {...defaultProps} />)
    // Submit button should not be visible before score selection
    expect(screen.queryByText('> SUBMIT')).not.toBeInTheDocument()

    // Click score 7
    await user.click(screen.getByText('7'))

    // Now textarea and submit should appear
    expect(screen.getByPlaceholderText('Any additional feedback? (optional)')).toBeInTheDocument()
    expect(screen.getByText('> SUBMIT')).toBeInTheDocument()
  })

  it('calls onSubmit with score and feedback on submit', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<NPSSurvey onSubmit={onSubmit} />)

    // Select score 9
    await user.click(screen.getByText('9'))

    // Type feedback
    const textarea = screen.getByPlaceholderText('Any additional feedback? (optional)')
    await user.type(textarea, 'Great product!')

    // Submit
    await user.click(screen.getByText('> SUBMIT'))

    expect(onSubmit).toHaveBeenCalledWith(9, 'Great product!')
  })

  it('calls onSubmit with score only when no feedback is entered', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<NPSSurvey onSubmit={onSubmit} />)

    await user.click(screen.getByText('5'))
    await user.click(screen.getByText('> SUBMIT'))

    expect(onSubmit).toHaveBeenCalledWith(5, undefined)
  })

  it('shows thank you message after submission', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<NPSSurvey onSubmit={onSubmit} />)

    await user.click(screen.getByText('8'))
    await user.click(screen.getByText('> SUBMIT'))

    await waitFor(() => {
      expect(screen.getByText('THANK YOU FOR YOUR FEEDBACK')).toBeInTheDocument()
    })
  })

  it('renders dismiss button and calls onDismiss when clicked', async () => {
    const onDismiss = vi.fn()
    const { user } = render(<NPSSurvey {...defaultProps} onDismiss={onDismiss} />)

    const dismissBtn = screen.getByText('DISMISS')
    expect(dismissBtn).toBeInTheDocument()
    await user.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<NPSSurvey {...defaultProps} />)
    expect(screen.queryByText('DISMISS')).not.toBeInTheDocument()
  })
})
