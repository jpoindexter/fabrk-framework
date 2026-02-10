'use client'

import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

const categories = [
  { name: 'UI', count: 8, examples: 'Button, Card, Badge, Tabs, Accordion, Dialog, Select, Input' },
  { name: 'Data Display', count: 6, examples: 'DataTable, EmptyState, Progress, StarRating, SegmentedControl' },
  { name: 'Charts', count: 6, examples: 'BarChart, LineChart, DonutChart, Gauge, Sparkline, AreaChart' },
  { name: 'Feedback', count: 4, examples: 'FeedbackWidget, NPSSurvey, CookieConsent, TerminalSpinner' },
  { name: 'AI', count: 3, examples: 'AiChatInput, TokenCounter, LogStream' },
  { name: 'Admin/Security', count: 4, examples: 'AuditLog, MfaCard, OnboardingChecklist, OrgSwitcher' },
  { name: 'Dashboard', count: 5, examples: 'DashboardShell, StatsGrid, KPICard, StatusPulse, TierBadge' },
]

export default function StorybookPage() {
  const totalStories = categories.reduce((acc, c) => acc + c.count, 0)

  return (
    <DocLayout
      title="STORYBOOK"
      description={`Browse all 105+ components interactively with ${totalStories}+ stories. Each story has autodocs and arg controls for live experimentation.`}
    >
      <Section title="LAUNCH">
        <CodeBlock title="run storybook">{`# Development (hot reload)
pnpm storybook          # Opens at localhost:6006

# Build static site
pnpm build-storybook    # Outputs to storybook-static/`}</CodeBlock>
      </Section>

      <Section title="STORY CATEGORIES">
        <InfoCard title="COVERAGE">
          {totalStories}+ stories across {categories.length} categories. All stories include autodocs for prop documentation.
        </InfoCard>

        {categories.map((cat) => (
          <div key={cat.name} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-foreground">{cat.name.toUpperCase()}</span>
              <span className="text-xs text-muted-foreground">{cat.count} stories</span>
            </div>
            <p className="text-xs text-muted-foreground">{cat.examples}</p>
          </div>
        ))}
      </Section>

      <Section title="WRITING STORIES">
        <p className="text-sm text-muted-foreground mb-4">
          Stories live next to their components using CSF3 format. Example:
        </p>
        <CodeBlock title="example.stories.tsx">{`import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: '> SUBMIT',
  },
}

export const Loading: Story = {
  args: {
    children: '> SUBMIT',
    loading: true,
    loadingText: 'Processing...',
  },
}`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
