import type { Meta, StoryObj } from '@storybook/react'
import { CodeBlock } from './code-block'

const meta = {
  title: 'UI/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CodeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    language: 'typescript',
    code: `import { DashboardShell, StatsGrid, LineChart } from '@fabrk/components'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', href: '/dashboard' },
        { id: 'repos', label: 'Repos', href: '/dashboard/repos' },
      ]}
      user={{ name: 'Jason', tier: 'pro' }}
    >
      <StatsGrid items={[
        { label: 'Files', value: 1572 },
        { label: 'Components', value: 279, change: '+12%' },
      ]} />
    </DashboardShell>
  )
}`,
  },
}

export const Bash: Story = {
  args: {
    language: 'bash',
    code: `pnpm add @fabrk/components @fabrk/design-system @fabrk/core`,
  },
}
