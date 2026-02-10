// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe } from '../test-utils'
import React from 'react'
import { Checkbox } from '../../ui/checkbox'

describe('Checkbox', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <div role="group" aria-label="Options">
        <label>
          Accept terms
          <Checkbox />
        </label>
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders as unchecked by default', () => {
    render(<Checkbox aria-label="Accept terms" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  it('checks on click', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />
    )
    await user.click(screen.getByRole('checkbox', { name: 'Accept terms' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('toggles via keyboard Space', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />
    )
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
    checkbox.focus()
    await user.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('respects disabled state', async () => {
    const onCheckedChange = vi.fn()
    const { user } = render(
      <Checkbox aria-label="Accept terms" disabled onCheckedChange={onCheckedChange} />
    )
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
    expect(checkbox).toBeDisabled()
    await user.click(checkbox)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
