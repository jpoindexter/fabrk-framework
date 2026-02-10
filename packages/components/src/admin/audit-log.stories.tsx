import type { Meta, StoryObj } from '@storybook/react'
import { AuditLog } from './audit-log'
import type { AuditLogEntry } from './audit-log'
import { fn } from '@storybook/test'

const meta = {
  title: 'Admin/AuditLog',
  component: AuditLog,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AuditLog>

export default meta
type Story = StoryObj<typeof meta>

const sampleLogs: AuditLogEntry[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Jason Poindexter',
    userEmail: 'jason@fabrk.dev',
    action: 'user.login',
    resource: '/dashboard',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120.0 (macOS)',
    metadata: {},
    timestamp: new Date('2025-01-15T10:30:00'),
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Sarah Chen',
    userEmail: 'sarah@fabrk.dev',
    action: 'api key.created',
    resource: '/settings/api-keys',
    ipAddress: '10.0.0.42',
    userAgent: 'Firefox/121.0 (Linux)',
    metadata: { keyName: 'production-api', permissions: ['read', 'write'] },
    timestamp: new Date('2025-01-15T09:15:00'),
  },
  {
    id: '3',
    userId: 'u1',
    userName: 'Jason Poindexter',
    userEmail: 'jason@fabrk.dev',
    action: 'settings.updated',
    resource: '/settings/general',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120.0 (macOS)',
    metadata: { field: 'companyName', oldValue: 'Acme', newValue: 'FABRK' },
    timestamp: new Date('2025-01-15T08:45:00'),
  },
  {
    id: '4',
    userId: 'u3',
    userName: 'Mike Torres',
    userEmail: 'mike@fabrk.dev',
    action: 'data.deleted',
    resource: '/projects/proj_abc',
    ipAddress: '172.16.0.5',
    userAgent: 'Safari/17.2 (macOS)',
    metadata: { projectId: 'proj_abc', projectName: 'Legacy App' },
    timestamp: new Date('2025-01-14T16:20:00'),
  },
  {
    id: '5',
    userId: 'u2',
    userName: 'Sarah Chen',
    userEmail: 'sarah@fabrk.dev',
    action: 'security.breach',
    resource: '/auth/login',
    ipAddress: '203.0.113.50',
    userAgent: 'Unknown',
    metadata: { reason: 'Multiple failed login attempts', attempts: 5 },
    timestamp: new Date('2025-01-14T14:10:00'),
  },
]

export const Default: Story = {
  args: {
    initialLogs: sampleLogs,
    onExport: fn(),
  },
}

export const Empty: Story = {
  args: {
    initialLogs: [],
    onExport: fn(),
  },
}

export const NoExport: Story = {
  args: {
    initialLogs: sampleLogs.slice(0, 3),
  },
}
