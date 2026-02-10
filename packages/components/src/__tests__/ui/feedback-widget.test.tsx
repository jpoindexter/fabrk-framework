import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe, waitFor } from '../test-utils'
import { FeedbackWidget } from '../../ui/feedback-widget'

describe('FeedbackWidget', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  }

  it('has no accessibility violations in trigger state', async () => {
    const { container } = render(<FeedbackWidget {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the trigger button with default label', () => {
    render(<FeedbackWidget {...defaultProps} />)
    expect(screen.getByText('> FEEDBACK')).toBeInTheDocument()
  })

  it('renders the trigger button with custom label', () => {
    render(<FeedbackWidget {...defaultProps} triggerLabel="> REPORT" />)
    expect(screen.getByText('> REPORT')).toBeInTheDocument()
  })

  it('opens the feedback form when trigger is clicked', async () => {
    const { user } = render(<FeedbackWidget {...defaultProps} />)
    await user.click(screen.getByText('> FEEDBACK'))

    expect(screen.getByText('[ SEND FEEDBACK ]')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe your feedback...')).toBeInTheDocument()
  })

  it('closes the form when close button is clicked', async () => {
    const { user } = render(<FeedbackWidget {...defaultProps} />)
    // Open
    await user.click(screen.getByText('> FEEDBACK'))
    expect(screen.getByText('[ SEND FEEDBACK ]')).toBeInTheDocument()

    // Close
    await user.click(screen.getByText('x'))
    // Should be back to trigger state
    expect(screen.getByText('> FEEDBACK')).toBeInTheDocument()
  })

  it('renders all feedback type buttons', async () => {
    const { user } = render(<FeedbackWidget {...defaultProps} />)
    await user.click(screen.getByText('> FEEDBACK'))

    expect(screen.getByText('[BUG]')).toBeInTheDocument()
    expect(screen.getByText('[FEATURE]')).toBeInTheDocument()
    expect(screen.getByText('[IMPROVE]')).toBeInTheDocument()
    expect(screen.getByText('[OTHER]')).toBeInTheDocument()
  })

  it('disables submit when message is empty', async () => {
    const { user } = render(<FeedbackWidget {...defaultProps} />)
    await user.click(screen.getByText('> FEEDBACK'))

    const submitBtn = screen.getByText('> SUBMIT')
    expect(submitBtn).toBeDisabled()
  })

  it('calls onSubmit with type, message, and optional email', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<FeedbackWidget onSubmit={onSubmit} />)

    // Open widget
    await user.click(screen.getByText('> FEEDBACK'))

    // Select bug type
    await user.click(screen.getByText('[BUG]'))

    // Enter message
    await user.type(screen.getByPlaceholderText('Describe your feedback...'), 'Found a bug')

    // Enter email
    await user.type(screen.getByPlaceholderText('Email (optional)'), 'test@test.com')

    // Submit
    await user.click(screen.getByText('> SUBMIT'))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'bug',
      message: 'Found a bug',
      email: 'test@test.com',
    })
  })

  it('shows confirmation message after submission', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<FeedbackWidget onSubmit={onSubmit} />)

    await user.click(screen.getByText('> FEEDBACK'))
    await user.type(screen.getByPlaceholderText('Describe your feedback...'), 'Nice!')
    await user.click(screen.getByText('> SUBMIT'))

    await waitFor(() => {
      expect(screen.getByText('FEEDBACK SUBMITTED. THANK YOU.')).toBeInTheDocument()
    })
  })

  it('submits without email when email is not provided', async () => {
    const onSubmit = vi.fn()
    const { user } = render(<FeedbackWidget onSubmit={onSubmit} />)

    await user.click(screen.getByText('> FEEDBACK'))
    await user.type(screen.getByPlaceholderText('Describe your feedback...'), 'Suggestion')
    await user.click(screen.getByText('> SUBMIT'))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'improvement', // default type
      message: 'Suggestion',
      email: undefined,
    })
  })
})
