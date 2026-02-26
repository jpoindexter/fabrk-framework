// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { MfaSetupDialog } from '../../security/mfa-setup-dialog'

describe('MfaSetupDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    qrCodeUri: 'otpauth://totp/TestApp:user@example.com?secret=JBSWY3DPEHPK3PXP',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    backupCodes: ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012'],
    onVerify: vi.fn().mockResolvedValue(true),
    onComplete: vi.fn(),
  }

  it('has no accessibility violations when open', async () => {
    const { container } = render(<MfaSetupDialog {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the QR step when first opened', () => {
    render(<MfaSetupDialog {...defaultProps} />)
    expect(screen.getByText('Set Up Two-Factor Authentication')).toBeInTheDocument()
    expect(screen.getByText(/scan the qr code/i)).toBeInTheDocument()
  })

  it('displays the TOTP secret after clicking show', async () => {
    const { user } = render(<MfaSetupDialog {...defaultProps} />)
    expect(screen.queryByText('JBSWY3DPEHPK3PXP')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /show/i }))
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
  })

  it('shows QR code placeholder when no renderQrCode provided', () => {
    render(<MfaSetupDialog {...defaultProps} />)
    expect(screen.getByText('QR CODE')).toBeInTheDocument()
    expect(screen.getByText('Provide renderQrCode prop')).toBeInTheDocument()
  })

  it('renders custom QR code via renderQrCode prop', () => {
    const renderQrCode = (uri: string) => <div data-testid="custom-qr">{uri}</div>
    render(<MfaSetupDialog {...defaultProps} renderQrCode={renderQrCode} />)
    expect(screen.getByTestId('custom-qr')).toBeInTheDocument()
  })

  it('shows continue button on QR step', () => {
    render(<MfaSetupDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('navigates to verify step when continue is clicked', async () => {
    const { user } = render(<MfaSetupDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText('Verify Your Authenticator')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(<MfaSetupDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Set Up Two-Factor Authentication')).not.toBeInTheDocument()
  })
})
