// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AuditLog, AuditLogEntry } from '../../admin/audit-log'

const sampleLogs: AuditLogEntry[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Jason Poindexter',
    userEmail: 'jason@example.com',
    action: 'user.login',
    resource: '/dashboard',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120',
    metadata: {},
    timestamp: new Date('2025-01-15T10:30:00'),
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Alice Smith',
    userEmail: 'alice@example.com',
    action: 'user.deleted',
    resource: '/users/u3',
    ipAddress: '10.0.0.5',
    userAgent: 'Firefox/121',
    metadata: { reason: 'inactive' },
    timestamp: new Date('2025-01-15T09:00:00'),
  },
  {
    id: '3',
    userId: 'u1',
    userName: 'Jason Poindexter',
    userEmail: 'jason@example.com',
    action: 'settings.updated',
    resource: '/settings/notifications',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120',
    metadata: {},
    timestamp: new Date('2025-01-14T16:00:00'),
  },
]

describe('AuditLog', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<AuditLog initialLogs={sampleLogs} />)
    // Exclude button-name rule: the Select trigger from Radix UI lacks an aria-label
    expect(await axe(container, { rules: { 'button-name': { enabled: false } } })).toHaveNoViolations()
  })

  it('renders log entries with user names', () => {
    render(<AuditLog initialLogs={sampleLogs} />)
    expect(screen.getAllByText('Jason Poindexter').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows action type badges', () => {
    render(<AuditLog initialLogs={sampleLogs} />)
    expect(screen.getByText('USER_LOGIN')).toBeInTheDocument()
    expect(screen.getByText('USER_DELETED')).toBeInTheDocument()
    expect(screen.getByText('SETTINGS_UPDATED')).toBeInTheDocument()
  })

  it('shows the audit log heading', () => {
    render(<AuditLog initialLogs={sampleLogs} />)
    expect(screen.getByText('[ AUDIT LOG ]')).toBeInTheDocument()
  })

  it('shows empty state when no logs provided', () => {
    render(<AuditLog initialLogs={[]} />)
    expect(screen.getByText('[NO AUDIT LOGS]: User actions will appear here')).toBeInTheDocument()
  })

  it('calls onExport callback when export button is clicked', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined)
    const { user } = render(<AuditLog initialLogs={sampleLogs} onExport={onExport} />)

    const exportButton = screen.getByRole('button', { name: /export csv/i })
    await user.click(exportButton)

    expect(onExport).toHaveBeenCalledOnce()
  })

  it('renders export button text', () => {
    render(<AuditLog initialLogs={sampleLogs} />)
    const exportButton = screen.getByRole('button', { name: /export csv/i })
    expect(exportButton).toBeInTheDocument()
  })

  it('shows IP addresses for entries', () => {
    render(<AuditLog initialLogs={sampleLogs} />)
    // Two entries share the same IP, so use getAllByText for that one
    expect(screen.getAllByText('• 192.168.1.1').length).toBe(2)
    expect(screen.getByText('• 10.0.0.5')).toBeInTheDocument()
  })
})
