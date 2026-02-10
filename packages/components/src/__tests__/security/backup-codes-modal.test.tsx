// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { BackupCodesModal } from '../../security/backup-codes-modal'

describe('BackupCodesModal', () => {
  const defaultCodes = [
    'ABC-12345',
    'DEF-67890',
    'GHI-11111',
    'JKL-22222',
    'MNO-33333',
    'PQR-44444',
  ]

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    codes: defaultCodes,
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<BackupCodesModal {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all backup codes', () => {
    render(<BackupCodesModal {...defaultProps} />)
    defaultCodes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument()
    })
  })

  it('renders the dialog title and description', () => {
    render(<BackupCodesModal {...defaultProps} />)
    expect(screen.getByText('Backup Codes')).toBeInTheDocument()
    expect(screen.getByText(/save these codes in a secure place/i)).toBeInTheDocument()
  })

  it('shows the security warning alert', () => {
    render(<BackupCodesModal {...defaultProps} />)
    expect(screen.getByText(/store these codes in a secure location/i)).toBeInTheDocument()
  })

  it('shows regenerate button when onRegenerate is provided', () => {
    const onRegenerate = vi.fn().mockResolvedValue(['NEW-11111', 'NEW-22222'])
    render(<BackupCodesModal {...defaultProps} onRegenerate={onRegenerate} />)
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
  })

  it('does not show regenerate button when onRegenerate is not provided', () => {
    render(<BackupCodesModal {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
  })

  it('calls onRegenerate callback when regenerate button is clicked', async () => {
    const onRegenerate = vi.fn().mockResolvedValue(['NEW-11111', 'NEW-22222'])
    const { user } = render(<BackupCodesModal {...defaultProps} onRegenerate={onRegenerate} />)

    await user.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })

  it('shows copy all and download buttons', () => {
    render(<BackupCodesModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /copy all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })

  it('shows empty state when no codes are provided', () => {
    render(<BackupCodesModal {...defaultProps} codes={[]} />)
    expect(screen.getByText('No backup codes available')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(<BackupCodesModal {...defaultProps} open={false} />)
    expect(screen.queryByText('Backup Codes')).not.toBeInTheDocument()
  })
})
