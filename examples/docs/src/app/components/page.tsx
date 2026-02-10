'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { DocLayout, Section, CodeBlock, InfoCard, PropsTable } from '@/components/doc-layout'

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
    description: '8 chart types for data visualization. All use design tokens and support theming.',
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
      {/* Design rules */}
      <Section title="DESIGN RULES">
        <p className="text-sm text-muted-foreground mb-4">
          All FABRK components follow these rules. Apply them when composing components together.
        </p>
        <CodeBlock title="import pattern">{`import { Button, Card, Badge, BarChart, KPICard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'`}</CodeBlock>

        <CodeBlock title="critical design rules">{`// RULE 1: Full borders — ALWAYS add mode.radius
<Card className={cn("border border-border", mode.radius)}>
<div className={cn("border-2 border-border", mode.radius)}>

// RULE 2: Partial borders — NEVER add mode.radius
<div className="border-t border-border">
<div className="border-b border-border">

// RULE 3: Table cells — NEVER add mode.radius (breaks layout)
<td className="border-b border-border px-4 py-3">

// RULE 4: Switches — Always rounded-full (pill-shaped)
<Switch className="rounded-full">

// RULE 5: Button text — UPPERCASE with > prefix
<Button>> SUBMIT</Button>
<Button>> CONTINUE</Button>

// RULE 6: Labels — UPPERCASE in brackets
<Badge>[ACTIVE]</Badge>
<span>[SYSTEM]</span>

// RULE 7: Use design tokens — NEVER hardcode colors
className="bg-primary text-primary-foreground"  // correct
className="bg-blue-500 text-white"              // WRONG`}</CodeBlock>

        <InfoCard title="DESIGN TOKEN REFERENCE">
          <strong>Backgrounds:</strong> bg-background, bg-card, bg-muted, bg-primary, bg-secondary, bg-destructive<br />
          <strong>Text:</strong> text-foreground, text-muted-foreground, text-primary, text-destructive, text-success<br />
          <strong>Borders:</strong> border-border, border-primary
        </InfoCard>
      </Section>

      {/* Key component examples */}
      <Section title="KEY COMPONENT EXAMPLES">
        <p className="text-sm text-muted-foreground mb-4">
          Code examples for the most commonly used components. See the full category listing below for all {totalComponents} components.
        </p>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          KPICARD
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Key performance indicator card with value, label, and trend arrow.
        </p>
        <CodeBlock title="KPICard">{`import { KPICard } from '@fabrk/components'

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <KPICard title="REVENUE" value="$12,340" trend={12.5} />
  <KPICard title="USERS" value="1,572" trend={8.3} />
  <KPICard title="ERRORS" value="3" trend={-50.0} />
  <KPICard title="UPTIME" value="99.9%" trend={0.1} />
</div>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          DATATABLE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Sortable, filterable data table with pagination. Accepts column definitions and row data.
        </p>
        <CodeBlock title="DataTable">{`import { DataTable } from '@fabrk/components'

const columns = [
  { key: 'name', label: 'NAME', sortable: true },
  { key: 'email', label: 'EMAIL', sortable: true },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'STATUS' },
]

const data = [
  { name: 'Jason', email: 'jason@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sarah', email: 'sarah@example.com', role: 'Member', status: 'Active' },
  { name: 'Mike', email: 'mike@example.com', role: 'Member', status: 'Invited' },
]

<DataTable
  columns={columns}
  data={data}
  onSort={(key, direction) => console.log(key, direction)}
  onRowClick={(row) => router.push(\`/users/\${row.id}\`)}
/>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          BARCHART AND LINECHART
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Data visualization with theme-aware colors. All 8 chart types share a consistent API.
        </p>
        <CodeBlock title="BarChart + LineChart">{`import { BarChart, LineChart, Card } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

const revenueData = [
  { label: 'Jan', value: 4200 },
  { label: 'Feb', value: 5100 },
  { label: 'Mar', value: 4800 },
  { label: 'Apr', value: 6300 },
  { label: 'May', value: 7200 },
]

// Bar chart
<Card className={cn('p-6 border border-border', mode.radius)}>
  <h3 className={cn('text-xs uppercase mb-4', mode.font)}>[MONTHLY REVENUE]</h3>
  <BarChart data={revenueData} />
</Card>

// Line chart
<Card className={cn('p-6 border border-border', mode.radius)}>
  <h3 className={cn('text-xs uppercase mb-4', mode.font)}>[TREND]</h3>
  <LineChart data={revenueData} />
</Card>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          DONUTCHART AND GAUGE
        </h3>
        <CodeBlock title="DonutChart + Gauge">{`import { DonutChart, Gauge } from '@fabrk/components'

// Donut chart with center label
<DonutChart
  data={[
    { label: 'Desktop', value: 62 },
    { label: 'Mobile', value: 28 },
    { label: 'Tablet', value: 10 },
  ]}
  centerLabel="TRAFFIC"
/>

// Circular gauge
<Gauge value={73} max={100} label="CPU USAGE" />`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          CHAT COMPONENTS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Build AI chat interfaces with ChatInput, ChatMessageList, and TokenCounter.
        </p>
        <CodeBlock title="AI Chat Interface">{`import {
  ChatInput, ChatMessageList, ChatSidebar, TokenCounter, UsageBar
} from '@fabrk/components'

function AIChat({ messages, conversations, onSend, onSelectConversation }) {
  return (
    <div className="flex h-screen">
      {/* Conversation sidebar */}
      <ChatSidebar
        conversations={conversations}
        onSelect={onSelectConversation}
        onNew={() => createConversation()}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold uppercase">[CHAT]</h2>
          <TokenCounter used={1250} limit={4096} />
        </div>

        <ChatMessageList messages={messages} className="flex-1" />

        <div className="p-4 border-t border-border">
          <UsageBar used={23.50} limit={50} label="DAILY BUDGET" />
          <ChatInput onSend={onSend} placeholder="Ask anything..." />
        </div>
      </div>
    </div>
  )
}`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          NOTIFICATION CENTER
        </h3>
        <CodeBlock title="NotificationCenter">{`import {
  NotificationCenter, NotificationBadge, NotificationList
} from '@fabrk/components'

// Dropdown notification center
<NotificationCenter
  notifications={notifications}
  onMarkRead={(id) => markAsRead(id)}
  onMarkAllRead={() => markAllRead()}
/>

// Or build your own with parts
<div className="relative">
  <NotificationBadge count={unreadCount} />
  <NotificationList
    notifications={notifications}
    onDismiss={(id) => dismiss(id)}
  />
</div>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          MFA COMPONENTS
        </h3>
        <CodeBlock title="MFA Setup">{`import { MfaCard, MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

// MFA status card
<MfaCard
  enabled={user.mfaEnabled}
  onEnable={() => setShowSetup(true)}
  onDisable={() => disableMfa()}
/>

// Setup dialog with QR code
<MfaSetupDialog
  open={showSetup}
  onOpenChange={setShowSetup}
  onSetup={async (secret) => {
    await api.post('/api/mfa/enable', { secret })
  }}
  renderQrCode={(uri) => <QRCode value={uri} />}
/>

// Backup codes modal
<BackupCodesModal
  codes={backupCodes}
  onRegenerate={() => api.post('/api/mfa/regenerate')}
/>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          PRICING AND MARKETING
        </h3>
        <CodeBlock title="PricingCard + OnboardingChecklist">{`import { PricingCard, UpgradeCTA, OnboardingChecklist } from '@fabrk/components'

// Pricing cards
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <PricingCard
    title="FREE"
    price="$0"
    period="/month"
    features={['5 projects', '1GB storage', 'Community support']}
    onSelect={() => selectPlan('free')}
  />
  <PricingCard
    title="PRO"
    price="$29"
    period="/month"
    features={['Unlimited projects', '100GB storage', 'Priority support', 'API access']}
    highlighted={true}
    onSelect={() => selectPlan('pro')}
  />
  <PricingCard
    title="ENTERPRISE"
    price="Custom"
    features={['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA']}
    onSelect={() => contactSales()}
  />
</div>

// Onboarding checklist
<OnboardingChecklist
  items={[
    { id: 'profile', label: 'Complete your profile', completed: true },
    { id: 'team', label: 'Invite team members', completed: true },
    { id: 'integration', label: 'Connect your first integration', completed: false },
    { id: 'deploy', label: 'Deploy to production', completed: false },
  ]}
  onItemClick={(id) => router.push(\`/onboarding/\${id}\`)}
/>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          TERMINAL FEEDBACK
        </h3>
        <CodeBlock title="Terminal-style components">{`import {
  TerminalSpinner, AsciiProgressBar, StatusPulse,
  Typewriter, LogStream
} from '@fabrk/components'

// Terminal loading spinner
<TerminalSpinner label="DEPLOYING..." />

// ASCII progress bar: [████████░░░░░░░░] 52%
<AsciiProgressBar value={52} max={100} />

// Status indicator with pulse animation
<StatusPulse status="healthy" label="API" />
<StatusPulse status="degraded" label="DATABASE" />
<StatusPulse status="down" label="QUEUE" />

// Typewriter text effect
<Typewriter text="Initializing FABRK framework..." speed={50} />

// Real-time log stream
<LogStream
  entries={[
    { timestamp: '12:03:45', level: 'info', message: 'Server started on port 3000' },
    { timestamp: '12:03:46', level: 'info', message: 'Connected to database' },
    { timestamp: '12:03:47', level: 'warn', message: 'Rate limiter using in-memory store' },
  ]}
/>`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>
          ERROR BOUNDARY
        </h3>
        <CodeBlock title="ErrorBoundary">{`import { ErrorBoundary } from '@fabrk/components'

// Wrap your app or sections in ErrorBoundary
<ErrorBoundary
  fallback={({ error, reset }) => (
    <div className="p-6 text-center">
      <div className="text-destructive text-sm font-bold uppercase">
        [RUNTIME ERROR]
      </div>
      <p className="text-muted-foreground text-xs mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 text-primary text-xs">
        > RETRY
      </button>
    </div>
  )}
>
  <App />
</ErrorBoundary>`}</CodeBlock>
      </Section>

      {/* Props reference */}
      <Section title="PROPS REFERENCE">
        <p className="text-sm text-muted-foreground mb-6">
          Prop definitions for the most commonly used components. For the full API, run <code className="text-primary">pnpm docs:api</code>.
        </p>

        <h3 id="props-button" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>BUTTON</h3>
        <PropsTable props={[
          { name: 'variant', type: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"', default: '"default"', description: 'Visual style variant' },
          { name: 'size', type: '"default" | "sm" | "lg" | "icon"', default: '"default"', description: 'Button size' },
          { name: 'loading', type: 'boolean', default: 'false', description: 'Show loading spinner and disable button' },
          { name: 'loadingText', type: 'string', description: 'Accessible label shown during loading' },
          { name: 'asChild', type: 'boolean', default: 'false', description: 'Render as child element (Slot)' },
        ]} />

        <h3 id="props-card" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>CARD</h3>
        <PropsTable props={[
          { name: 'className', type: 'string', description: 'Additional CSS classes. Always add mode.radius for border radius.' },
          { name: 'children', type: 'ReactNode', description: 'Card content. Use CardHeader, CardContent, CardFooter for structure.' },
        ]} />

        <h3 id="props-kpicard" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>KPICARD</h3>
        <PropsTable props={[
          { name: 'title', type: 'string', description: 'KPI label (renders UPPERCASE)' },
          { name: 'value', type: 'string | number', description: 'Display value' },
          { name: 'trend', type: 'number', description: 'Percentage change. Positive = green arrow up, negative = red arrow down.' },
          { name: 'icon', type: 'ReactNode', description: 'Optional icon beside the title' },
        ]} />

        <h3 id="props-datatable" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>DATATABLE</h3>
        <PropsTable props={[
          { name: 'columns', type: 'ColumnDef[]', description: 'TanStack Table column definitions' },
          { name: 'data', type: 'T[]', description: 'Row data array' },
          { name: 'searchKey', type: 'string', description: 'Column key to enable search filtering' },
          { name: 'onRowClick', type: '(row: T) => void', description: 'Callback when a row is clicked' },
          { name: 'pageSize', type: 'number', default: '10', description: 'Rows per page' },
        ]} />

        <h3 id="props-barchart" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>BARCHART</h3>
        <PropsTable props={[
          { name: 'data', type: '{ label: string; value: number }[]', description: 'Chart data points' },
          { name: 'height', type: 'number', default: '300', description: 'Chart height in pixels' },
          { name: 'horizontal', type: 'boolean', default: 'false', description: 'Render as horizontal bar chart' },
          { name: 'stacked', type: 'boolean', default: 'false', description: 'Stack bars (for multi-series data)' },
          { name: 'colorByIndex', type: 'boolean', default: 'false', description: 'Use different colors per bar' },
        ]} />

        <h3 id="props-starrating" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>STARRATING</h3>
        <PropsTable props={[
          { name: 'value', type: 'number', description: 'Current rating value' },
          { name: 'max', type: 'number', default: '5', description: 'Maximum number of stars' },
          { name: 'onChange', type: '(value: number) => void', description: 'Callback when a star is clicked' },
          { name: 'readonly', type: 'boolean', default: 'false', description: 'Display-only mode, disables interaction' },
          { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Star size' },
        ]} />

        <h3 id="props-npssurvey" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>NPSSURVEY</h3>
        <PropsTable props={[
          { name: 'onSubmit', type: '(score: number, feedback?: string) => void', description: 'Callback with score (0-10) and optional feedback text' },
          { name: 'onDismiss', type: '() => void', description: 'Callback when dismiss button is clicked' },
          { name: 'title', type: 'string', default: '"How likely..."', description: 'Survey question text' },
        ]} />

        <h3 id="props-gauge" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>GAUGE</h3>
        <PropsTable props={[
          { name: 'value', type: 'number', description: 'Current value' },
          { name: 'max', type: 'number', default: '100', description: 'Maximum value' },
          { name: 'label', type: 'string', description: 'Label below the gauge' },
          { name: 'unit', type: 'string', description: 'Unit suffix (e.g., "%")' },
          { name: 'segments', type: '{ color: string; end: number }[]', description: 'Color segments for the arc' },
        ]} />

        <h3 id="props-dialog" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>DIALOG</h3>
        <PropsTable props={[
          { name: 'open', type: 'boolean', description: 'Controlled open state' },
          { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Callback when open state changes' },
          { name: 'children', type: 'ReactNode', description: 'Use DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription' },
        ]} />

        <h3 id="props-select" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>SELECT</h3>
        <PropsTable props={[
          { name: 'value', type: 'string', description: 'Controlled selected value' },
          { name: 'onValueChange', type: '(value: string) => void', description: 'Callback when selection changes' },
          { name: 'placeholder', type: 'string', description: 'Placeholder text when no value is selected' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the select' },
        ]} />

        <h3 id="props-chatinput" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>CHATINPUT</h3>
        <PropsTable props={[
          { name: 'onSend', type: '(message: string, attachments?: File[]) => void', description: 'Callback when message is sent (Enter key or button)' },
          { name: 'onStop', type: '() => void', description: 'Callback when stop button is clicked during streaming' },
          { name: 'isLoading', type: 'boolean', default: 'false', description: 'Show stop button instead of send button' },
          { name: 'models', type: '{ id: string; name: string }[]', description: 'Available AI models for the model selector' },
          { name: 'selectedModelId', type: 'string', description: 'Currently selected model ID' },
          { name: 'onModelChange', type: '(modelId: string) => void', description: 'Callback when model selection changes' },
        ]} />

        <h3 id="props-mfacard" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>MFACARD</h3>
        <PropsTable props={[
          { name: 'twoFactorEnabled', type: 'boolean', description: 'Current 2FA status' },
          { name: 'onEnable2FA', type: '() => void', description: 'Callback to start MFA setup' },
          { name: 'onDisable2FA', type: '() => void', description: 'Callback to disable MFA' },
          { name: 'onViewBackupCodes', type: '() => void', description: 'Callback to view backup codes' },
          { name: 'isEnabling2FA', type: 'boolean', description: 'Loading state for enable action' },
          { name: 'isDisabling2FA', type: 'boolean', description: 'Loading state for disable action' },
        ]} />

        <h3 id="props-cookieconsent" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>COOKIECONSENT</h3>
        <PropsTable props={[
          { name: 'onAcceptAll', type: '(prefs: CookiePreferences) => void', description: 'Callback when all cookies are accepted' },
          { name: 'onAcceptSelected', type: '(prefs: CookiePreferences) => void', description: 'Callback when selected cookies are accepted' },
          { name: 'onRejectAll', type: '(prefs: CookiePreferences) => void', description: 'Callback when all non-essential cookies are rejected' },
          { name: 'cookieKey', type: 'string', default: '"cookie-consent"', description: 'localStorage key for persisting preferences' },
        ]} />

        <h3 id="props-segmentedcontrol" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>SEGMENTEDCONTROL</h3>
        <PropsTable props={[
          { name: 'options', type: '{ value: T; label: string; disabled?: boolean }[]', description: 'Segment options' },
          { name: 'value', type: 'T', description: 'Currently selected value' },
          { name: 'onChange', type: '(value: T) => void', description: 'Callback when selection changes' },
          { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Control size' },
        ]} />

        <h3 id="props-progress" className={cn('text-sm font-semibold text-foreground uppercase mt-8 mb-3', mode.font)}>PROGRESS</h3>
        <PropsTable props={[
          { name: 'value', type: 'number', description: 'Progress value (0-100)' },
          { name: 'label', type: 'string', description: 'Label text above the bar' },
          { name: 'showPercentage', type: 'boolean', default: 'true', description: 'Show percentage text' },
          { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Bar height' },
        ]} />
      </Section>

      {/* Category index */}
      <Section title="ALL CATEGORIES">
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
          <div className={cn('border border-border divide-y divide-border', mode.radius)}>
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
