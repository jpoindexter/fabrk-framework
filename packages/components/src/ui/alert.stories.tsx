import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertTitle, AlertDescription } from './alert'

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>[INFO] System Notice</AlertTitle>
      <AlertDescription>A new update is available. Please review the changelog.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>[ERROR] Connection Failed</AlertTitle>
      <AlertDescription>Unable to reach the server. Check your network connection.</AlertDescription>
    </Alert>
  ),
}
