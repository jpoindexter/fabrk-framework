// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe, waitFor } from '../test-utils'
import React from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu'

function TestDropdownMenu({ onSelect }: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Actions</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelect}>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('does not render content when closed', () => {
    render(<TestDropdownMenu />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('opens on trigger click and shows menu items', async () => {
    const { user } = render(<TestDropdownMenu />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('has no accessibility violations when open', async () => {
    const { user } = render(<TestDropdownMenu />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    // Exclude 'region' rule — Radix portals render outside landmarks (known false positive)
    expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations()
  })

  it('fires onSelect when a menu item is clicked', async () => {
    const onSelect = vi.fn()
    const { user } = render(<TestDropdownMenu onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Edit'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key press', async () => {
    const { user } = render(<TestDropdownMenu />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
  })
})
