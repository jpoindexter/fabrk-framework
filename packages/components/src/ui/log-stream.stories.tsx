import type { Meta, StoryObj } from '@storybook/react'
import { LogStream } from './log-stream'
import type { LogEntry } from './log-stream'

const meta = {
  title: 'Terminal/LogStream',
  component: LogStream,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LogStream>

export default meta
type Story = StoryObj<typeof meta>

const sampleEntries: LogEntry[] = [
  { id: '1', level: 'info', message: 'Server started on port 3000', timestamp: new Date('2025-01-15T10:00:00'), source: 'server' },
  { id: '2', level: 'success', message: 'Database connection established', timestamp: new Date('2025-01-15T10:00:01'), source: 'db' },
  { id: '3', level: 'debug', message: 'Loading configuration from env', timestamp: new Date('2025-01-15T10:00:02'), source: 'config' },
  { id: '4', level: 'warn', message: 'Rate limit threshold at 80%', timestamp: new Date('2025-01-15T10:00:03'), source: 'ratelimit' },
  { id: '5', level: 'error', message: 'Failed to fetch user profile: 404 Not Found', timestamp: new Date('2025-01-15T10:00:04'), source: 'api' },
  { id: '6', level: 'info', message: 'Processing webhook event: checkout.completed', timestamp: new Date('2025-01-15T10:00:05'), source: 'webhook' },
  { id: '7', level: 'success', message: 'Payment processed successfully ($49.99)', timestamp: new Date('2025-01-15T10:00:06'), source: 'payments' },
]

export const Default: Story = {
  args: {
    entries: sampleEntries,
    showTimestamps: true,
    maxHeight: '16rem',
  },
}

export const NoTimestamps: Story = {
  args: {
    entries: sampleEntries,
    showTimestamps: false,
  },
}

export const ErrorsOnly: Story = {
  args: {
    entries: sampleEntries.filter((e) => e.level === 'error' || e.level === 'warn'),
    showTimestamps: true,
  },
}
