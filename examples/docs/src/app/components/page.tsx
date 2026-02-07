'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { DocLayout, Section, CodeBlock } from '@/components/doc-layout'

interface ComponentCategory {
  name: string
  description: string
  items: { name: string; description: string }[]
}

const categories: ComponentCategory[] = [
  {
    name: 'FORM CONTROLS',
    description: 'Input components for forms and data entry.',
    items: [
      { name: 'Button', description: 'Primary action button with terminal styling' },
      { name: 'Input', description: 'Text input with label and error states' },
      { name: 'InputGroup', description: 'Input with prefix/suffix addons' },
      { name: 'InputNumber', description: 'Numeric input with increment/decrement' },
      { name: 'InputOTP', description: 'One-time password input' },
      { name: 'InputPassword', description: 'Password input with show/hide toggle' },
      { name: 'InputSearch', description: 'Search input with icon' },
      { name: 'Textarea', description: 'Multi-line text input' },
      { name: 'Select', description: 'Dropdown select with options' },
      { name: 'Checkbox', description: 'Checkbox input' },
      { name: 'RadioGroup', description: 'Radio button group' },
      { name: 'Switch', description: 'Toggle switch (always rounded-full)' },
      { name: 'Slider', description: 'Range slider input' },
      { name: 'DatePicker', description: 'Calendar-based date selector' },
      { name: 'Calendar', description: 'Calendar component' },
      { name: 'Form', description: 'Form wrapper with validation' },
      { name: 'FormError', description: 'Form error message display' },
      { name: 'Label', description: 'Form input label' },
    ],
  },
  {
    name: 'LAYOUT',
    description: 'Structural layout components.',
    items: [
      { name: 'Card', description: 'Content container with border' },
      { name: 'Container', description: 'Max-width content wrapper' },
      { name: 'Separator', description: 'Horizontal or vertical divider' },
      { name: 'ScrollArea', description: 'Scrollable content area' },
      { name: 'Sidebar', description: 'Application sidebar' },
      { name: 'Tabs / StyledTabs', description: 'Tab navigation' },
      { name: 'Accordion', description: 'Collapsible content sections' },
    ],
  },
  {
    name: 'DATA DISPLAY',
    description: 'Components for displaying data and metrics.',
    items: [
      { name: 'DataTable', description: 'Sortable, filterable data table' },
      { name: 'Table', description: 'Basic HTML table with styling' },
      { name: 'KPICard', description: 'Key performance indicator card with trend' },
      { name: 'StatCard', description: 'Statistics display card' },
      { name: 'Badge', description: 'Status badge with variants' },
      { name: 'Tag', description: 'Categorization tag' },
      { name: 'Avatar', description: 'User avatar with fallback' },
      { name: 'Heatmap', description: 'Activity heatmap grid' },
      { name: 'JSONViewer', description: 'Formatted JSON display' },
      { name: 'CodeBlock', description: 'Syntax-highlighted code' },
      { name: 'Pagination', description: 'Page navigation' },
      { name: 'EmptyState', description: 'Empty state placeholder' },
      { name: 'Breadcrumb', description: 'Navigation breadcrumbs' },
    ],
  },
  {
    name: 'CHARTS',
    description: '8 chart types for data visualization.',
    items: [
      { name: 'BarChart', description: 'Vertical bar chart' },
      { name: 'LineChart', description: 'Line chart with smooth curves' },
      { name: 'AreaChart', description: 'Filled area chart' },
      { name: 'PieChart', description: 'Pie chart with labels' },
      { name: 'DonutChart', description: 'Donut chart with center value' },
      { name: 'FunnelChart', description: 'Conversion funnel visualization' },
      { name: 'Gauge', description: 'Circular gauge meter' },
      { name: 'Sparkline', description: 'Inline mini chart' },
    ],
  },
  {
    name: 'FEEDBACK',
    description: 'User interaction and feedback components.',
    items: [
      { name: 'Alert', description: 'Inline alert message' },
      { name: 'AlertDialog', description: 'Confirmation dialog' },
      { name: 'Dialog', description: 'Modal dialog' },
      { name: 'Sheet', description: 'Slide-out panel' },
      { name: 'Toaster', description: 'Toast notification system' },
      { name: 'Loading', description: 'Loading spinner' },
      { name: 'TerminalSpinner', description: 'Terminal-style loading animation' },
      { name: 'Progress', description: 'Progress bar' },
      { name: 'AsciiProgressBar', description: 'ASCII-art progress bar' },
      { name: 'StatusPulse', description: 'Pulsing status indicator' },
      { name: 'Typewriter', description: 'Typewriter text effect' },
      { name: 'StarRating', description: 'Star rating input' },
      { name: 'NPSSurvey', description: 'Net Promoter Score survey' },
      { name: 'FeedbackWidget', description: 'Inline feedback collector' },
      { name: 'ErrorBoundary', description: 'React error boundary with terminal UI' },
    ],
  },
  {
    name: 'NAVIGATION',
    description: 'Navigation and menu components.',
    items: [
      { name: 'Command', description: 'Command palette (Cmd+K)' },
      { name: 'DropdownMenu', description: 'Dropdown menu with items' },
      { name: 'Popover', description: 'Popover content container' },
      { name: 'Tooltip', description: 'Hover tooltip' },
      { name: 'SegmentedControl', description: 'Segmented toggle control' },
    ],
  },
  {
    name: 'AI',
    description: 'AI chat and interaction components.',
    items: [
      { name: 'ChatInput', description: 'Chat input with attachment support' },
      { name: 'ChatMessageList', description: 'Message list with streaming' },
      { name: 'ChatSidebar', description: 'Conversation list sidebar' },
      { name: 'TokenCounter', description: 'Token usage counter' },
      { name: 'UsageBar', description: 'AI usage progress bar' },
      { name: 'LogStream', description: 'Real-time log streaming display' },
    ],
  },
  {
    name: 'ADMIN',
    description: 'Admin dashboard components.',
    items: [
      { name: 'AuditLog', description: 'Audit log table viewer' },
      { name: 'AdminMetricsCard', description: 'Admin metrics display' },
      { name: 'SystemHealthWidget', description: 'System health dashboard' },
      { name: 'NotificationCenter', description: 'Notification center dropdown' },
      { name: 'NotificationBadge', description: 'Unread count badge' },
      { name: 'NotificationList', description: 'Notification list view' },
    ],
  },
  {
    name: 'SECURITY',
    description: 'Security and authentication UI.',
    items: [
      { name: 'MfaCard', description: 'MFA status card' },
      { name: 'MfaSetupDialog', description: 'MFA setup wizard' },
      { name: 'BackupCodesModal', description: 'Backup code management' },
      { name: 'CookieConsent', description: 'Cookie consent banner' },
    ],
  },
  {
    name: 'ORGANIZATION',
    description: 'Team and organization management.',
    items: [
      { name: 'OrgSwitcher', description: 'Organization selector' },
      { name: 'MemberCard', description: 'Team member display' },
      { name: 'TeamActivityFeed', description: 'Team activity timeline' },
    ],
  },
  {
    name: 'MARKETING',
    description: 'Marketing and onboarding.',
    items: [
      { name: 'PricingCard', description: 'Pricing plan card' },
      { name: 'UpgradeCTA', description: 'Upgrade call-to-action' },
      { name: 'OnboardingChecklist', description: 'Onboarding progress checklist' },
      { name: 'SchemaScript', description: 'JSON-LD structured data for SEO' },
      { name: 'SimpleIcon', description: 'Simple icon component' },
    ],
  },
]

export default function ComponentsPage() {
  const totalComponents = categories.reduce((acc, cat) => acc + cat.items.length, 0)

  return (
    <DocLayout
      title="COMPONENTS"
      description={`${totalComponents} pre-built components organized by category. All use design tokens and the terminal aesthetic.`}
    >
      {/* Usage example */}
      <Section title="USAGE">
        <CodeBlock title="import components">{`import { Button, Card, Badge, BarChart, KPICard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'`}</CodeBlock>

        <CodeBlock title="design rules">{`// Full borders — ALWAYS add mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Partial borders — NEVER add mode.radius
<div className="border-t border-border">

// Button text — UPPERCASE with > prefix
<Button>> SUBMIT</Button>

// Labels — UPPERCASE in brackets
<Badge>[ACTIVE]</Badge>

// Use design tokens — NEVER hardcode colors
className="bg-primary text-primary-foreground"  // correct
className="bg-blue-500 text-white"              // wrong`}</CodeBlock>
      </Section>

      {/* Category index */}
      <Section title="CATEGORIES">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href={`#${cat.name.toLowerCase().replace(/\s/g, '-')}`}
              className={cn(
                'block border border-border bg-card p-3 transition-colors hover:border-primary',
                mode.radius
              )}
            >
              <div className={cn('text-xs font-bold text-primary', mode.font)}>
                {cat.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {cat.items.length} components
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* Component lists */}
      {categories.map((cat) => (
        <Section
          key={cat.name}
          id={cat.name.toLowerCase().replace(/\s/g, '-')}
          title={cat.name}
        >
          <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>
          <div className="border border-border divide-y divide-border">
            {cat.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className={cn('text-sm font-bold text-foreground', mode.font)}>
                    {item.name}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right max-w-xs">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </DocLayout>
  )
}
