// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Input } from '../../ui/input'

describe('Input', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <label>
        Email
        <Input />
      </label>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('updates value when user types', async () => {
    const { user } = render(<Input placeholder="Enter email" />)
    const input = screen.getByPlaceholderText('Enter email')
    await user.type(input, 'hello@test.com')
    expect(input).toHaveValue('hello@test.com')
  })

  it('sets aria-invalid when error prop is true', () => {
    render(<Input error data-testid="err-input" />)
    expect(screen.getByTestId('err-input')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when error is absent', () => {
    render(<Input data-testid="ok-input" />)
    expect(screen.getByTestId('ok-input')).not.toHaveAttribute('aria-invalid')
  })

  it('disables input when disabled prop is set', async () => {
    const onChange = vi.fn()
    const { user } = render(<Input disabled onChange={onChange} placeholder="disabled" />)
    const input = screen.getByPlaceholderText('disabled')
    expect(input).toBeDisabled()
    await user.type(input, 'test')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables input and shows spinner in loading state', () => {
    render(<Input loading loadingText="Loading data" data-testid="loading-input" />)
    const input = screen.getByTestId('loading-input')
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading data')).toBeInTheDocument()
  })
})
