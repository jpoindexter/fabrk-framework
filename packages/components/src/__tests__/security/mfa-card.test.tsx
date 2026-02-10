// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { MfaCard } from '../../security/mfa-card'

describe('MfaCard', () => {
  const enabledProps = {
    twoFactorEnabled: true,
    isEnabling2FA: false,
    isDisabling2FA: false,
    onEnable2FA: vi.fn(),
    onDisable2FA: vi.fn(),
    onViewBackupCodes: vi.fn(),
  }

  const disabledProps = {
    ...enabledProps,
    twoFactorEnabled: false,
  }

  it('has no accessibility violations when enabled', async () => {
    const { container } = render(<MfaCard {...enabledProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no accessibility violations when disabled', async () => {
    const { container } = render(<MfaCard {...disabledProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows enabled state with badge and protection message', () => {
    render(<MfaCard {...enabledProps} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('2FA is currently protecting your account')).toBeInTheDocument()
  })

  it('shows disabled state with badge', () => {
    render(<MfaCard {...disabledProps} />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('shows enable button when 2FA is disabled', () => {
    render(<MfaCard {...disabledProps} />)
    expect(screen.getByRole('button', { name: /enable 2fa/i })).toBeInTheDocument()
  })

  it('shows disable and backup codes buttons when 2FA is enabled', () => {
    render(<MfaCard {...enabledProps} />)
    expect(screen.getByRole('button', { name: /disable 2fa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view backup codes/i })).toBeInTheDocument()
  })

  it('calls onEnable2FA callback when enable button is clicked', async () => {
    const onEnable2FA = vi.fn()
    const { user } = render(<MfaCard {...disabledProps} onEnable2FA={onEnable2FA} />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))
    expect(onEnable2FA).toHaveBeenCalledOnce()
  })

  it('calls onDisable2FA callback when disable button is clicked', async () => {
    const onDisable2FA = vi.fn()
    const { user } = render(<MfaCard {...enabledProps} onDisable2FA={onDisable2FA} />)

    await user.click(screen.getByRole('button', { name: /disable 2fa/i }))
    expect(onDisable2FA).toHaveBeenCalledOnce()
  })

  it('calls onViewBackupCodes callback when backup codes button is clicked', async () => {
    const onViewBackupCodes = vi.fn()
    const { user } = render(<MfaCard {...enabledProps} onViewBackupCodes={onViewBackupCodes} />)

    await user.click(screen.getByRole('button', { name: /view backup codes/i }))
    expect(onViewBackupCodes).toHaveBeenCalledOnce()
  })

  it('shows setting up state while enabling', () => {
    render(<MfaCard {...disabledProps} isEnabling2FA={true} />)
    expect(screen.getByRole('button', { name: /setting up/i })).toBeDisabled()
  })

  it('shows disabling state while disabling', () => {
    render(<MfaCard {...enabledProps} isDisabling2FA={true} />)
    expect(screen.getByRole('button', { name: /disabling/i })).toBeDisabled()
  })
})
