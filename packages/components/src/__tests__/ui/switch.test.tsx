// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Switch } from '../../ui/switch'

describe('Switch', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Switch aria-label="Toggle notifications" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders as unchecked by default', () => {
    render(<Switch aria-label="Toggle" />)
    const switchEl = screen.getByRole('switch', { name: 'Toggle' })
    expect(switchEl).toHaveAttribute('data-state', 'unchecked')
  })

  it('toggles on click', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Switch aria-label="Toggle" onCheckedChange={onCheckedChange} />
    )
    const switchEl = screen.getByRole('switch', { name: 'Toggle' })
    await user.click(switchEl)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('toggles via keyboard Space', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Switch aria-label="Toggle" onCheckedChange={onCheckedChange} />
    )
    const switchEl = screen.getByRole('switch', { name: 'Toggle' })
    switchEl.focus()
    await user.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('respects controlled checked state', () => {
    render(<Switch aria-label="Toggle" checked={true} onCheckedChange={() => {}} />)
    const switchEl = screen.getByRole('switch', { name: 'Toggle' })
    expect(switchEl).toHaveAttribute('data-state', 'checked')
  })

  it('respects disabled state', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Switch aria-label="Toggle" disabled onCheckedChange={onCheckedChange} />
    )
    const switchEl = screen.getByRole('switch', { name: 'Toggle' })
    expect(switchEl).toBeDisabled()
    await user.click(switchEl)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
