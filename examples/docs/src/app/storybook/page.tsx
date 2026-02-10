'use client'

import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

const categories = [
  { name: 'UI Controls', count: 15, examples: 'Button, Card, Input, Select, Switch, Checkbox, Tabs, Dialog, Alert, Accordion, Badge, CodeBlock, Breadcrumb, PageHeader, Sidebar' },
  { name: 'Data Display', count: 13, examples: 'KPICard, StatsGrid, DataTable, Tag, EmptyState, Progress, JsonViewer, AsciiProgressBar, StarRating, SegmentedControl, StatusPulse, TokenCounter, TierBadge' },
  { name: 'Layout', count: 7, examples: 'DashboardShell, DashboardHeader, TerminalCard, PricingCard, UsageBar, UpgradeCta, NotificationList' },
  { name: 'Charts', count: 8, examples: 'BarChart, LineChart, DonutChart, AreaChart, PieChart, FunnelChart, Gauge, Sparkline' },
  { name: 'Feedback', count: 6, examples: 'FeedbackWidget, NPSSurvey, CookieConsent, TerminalSpinner, OnboardingChecklist, LogStream' },
  { name: 'Organization', count: 3, examples: 'OrgSwitcher, MemberCard, TeamActivityFeed' },
  { name: 'Admin/Security', count: 6, examples: 'AuditLog, SystemHealth, NotificationCenter, MfaCard, BackupCodesModal, MfaSetupDialog' },
  { name: 'AI', count: 1, examples: 'ChatInput' },
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
