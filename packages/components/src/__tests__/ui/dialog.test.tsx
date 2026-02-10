// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, axe, waitFor } from '../test-utils'
import React from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '../../ui/dialog'

function TestDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button>Open Dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>Are you sure you want to proceed?</DialogDescription>
        </DialogHeader>
        <p>Dialog body content</p>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('does not render content when closed', () => {
    render(<TestDialog />)
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('opens on trigger click and renders content', async () => {
    const { user } = render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
      expect(screen.getByText('Dialog body content')).toBeInTheDocument()
    })
  })

  it('has no accessibility violations when open', async () => {
    const { user } = render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })
    // axe scans the full document including portaled content
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('closes on Escape key press', async () => {
    const onOpenChange = vi.fn()
    const { user } = render(<TestDialog onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
    })
  })

  it('closes on close button click', async () => {
    const { user } = render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })
    // DialogContent renders a close button with sr-only "Close" text
    const closeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(closeButton)
    await waitFor(() => {
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
    })
  })
})
