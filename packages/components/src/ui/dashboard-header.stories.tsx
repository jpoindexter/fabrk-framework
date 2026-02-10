import type { Meta, StoryObj } from '@storybook/react'
import { DashboardHeader } from './dashboard-header'
import { Button } from './button'

const meta = {
  title: 'Dashboard/DashboardHeader',
  component: DashboardHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DashboardHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'OVERVIEW',
    subtitle: 'System monitoring dashboard',
  },
}

export const WithActions: Story = {
  render: () => (
    <DashboardHeader
      title="REPOSITORIES"
      subtitle="3 connected"
      actions={
        <Button size="sm">&gt; CONNECT REPO</Button>
      }
    />
  ),
}
