// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe, waitFor } from '../test-utils'
import React from 'react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../../ui/select'

function TestSelect({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Choose fruit">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select', () => {
  it('has no accessibility violations in closed state', async () => {
    const { container } = render(<TestSelect />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the trigger with placeholder text', () => {
    render(<TestSelect />)
    expect(screen.getByText('Select a fruit')).toBeInTheDocument()
  })

  it('opens dropdown on trigger click and shows items', async () => {
    const { user } = render(<TestSelect />)
    const trigger = screen.getByRole('combobox', { name: 'Choose fruit' })
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('Banana')).toBeInTheDocument()
      expect(screen.getByText('Cherry')).toBeInTheDocument()
    })
  })

  it('calls onValueChange when an item is selected', async () => {
    const onValueChange = vi.fn()
    const { user } = render(<TestSelect onValueChange={onValueChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Choose fruit' })
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('Banana')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Banana'))
    expect(onValueChange).toHaveBeenCalledWith('banana')
  })
})
