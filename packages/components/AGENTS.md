# @fabrk/components — AI Agent Reference

105+ production-ready React components. All theme-aware via `@fabrk/design-system`.
Always a `"use client"` package — components work in Next.js App Router client components.

---

## Quick Import

```tsx
import {
  DashboardShell, DashboardHeader, StatsGrid, KpiCard,
  BarChart, LineChart, DonutChart,
  AiChat, DataTable, Button, Badge,
} from '@fabrk/components'
```

Always import from `@fabrk/components`. Never import from subpaths like
`@fabrk/components/ui/button`.

---

## UI Components

### Layout
- `DashboardShell` — full sidebar + header + content layout (see Dashboard section)
- `DashboardHeader` — page title bar with optional actions slot
- `PageHeader` — hero-style header with title, subtitle, and actions
- `StatsGrid` — responsive grid of stat items; props: `items: { label, value, change? }[]`
- `Container` — max-width wrapper with horizontal padding
- `Card`, `CardHeader`, `CardContent` — bordered card with terminal-style header
- `Separator` — horizontal/vertical divider
- `ScrollArea` — styled scrollable container
- `Sheet` — slide-out panel (drawer)

### Forms & Inputs
- `Button` — `variant`: `default | ghost | outline | destructive | secondary | link`; `size`: `default | sm | lg | icon`
- `Input`, `Textarea` — standard text inputs
- `InputGroup` — label + input + optional prefix/suffix wrapper
- `InputNumber` — numeric input with increment/decrement controls
- `InputPassword` — password input with show/hide toggle
- `InputSearch` — search input with clear button
- `InputOTP` — 6-digit OTP entry field
- `Select`, `RadioGroup`, `Checkbox`, `Switch`, `Slider` — form controls
- `DatePicker`, `Calendar` — date selection
- `Form`, `FormError` — React Hook Form integration wrappers
- `Label` — accessible label

### Feedback & Status
- `Alert` — info/warning/error/success banner
- `AlertDialog` — confirmation modal
- `Dialog` — general-purpose modal
- `Toaster` — toast notification host (place once in root layout)
- `Loading` — spinner/skeleton states
- `Progress` — percentage bar; props: `value`, `max`, `label`
- `StatusPulse` — animated dot indicator
- `TerminalSpinner` — ASCII-style loading spinner
- `ErrorBoundary` — React error boundary wrapper
- `EmptyState` — zero-data placeholder with icon + message

### Navigation
- `Breadcrumb` — path navigation breadcrumbs
- `Pagination` — page controls; props: `page`, `totalPages`, `onPageChange`
- `Tabs`, `StyledTabs` — tab groups
- `SegmentedControl` — inline multi-option selector
- `DropdownMenu`, `Popover` — floating menus
- `Command` — Cmd+K command palette
- `Sidebar` — standalone sidebar primitive
- `Tooltip` — hover tooltip

### Data Display
- `DataTable` — sortable, filterable table; props: `columns`, `data`
- `Table`, `TableHead`, `TableRow`, `TableCell` — raw table primitives
- `Badge` — inline label chip
- `TierBadge` — colored tier label; props: `tier` (`free | pro | enterprise`), `size`, `showIcon`
- `Avatar` — user avatar with fallback initials
- `CodeBlock` — syntax-highlighted code display
- `JsonViewer` — collapsible JSON tree
- `Heatmap` — calendar-style activity heatmap
- `StarRating` — read/write star rating
- `TokenCounter` — token budget display
- `UsageBar` — horizontal usage gauge
- `AsciiProgressBar` — terminal-style `[====    ]` bar
- `LogStream` — scrollable live log output pane
- `Typewriter` — animated character-by-character text reveal

### Engagement & Conversion
- `PricingCard` — plan card with feature list and CTA
- `UpgradeCTA` — tier upgrade prompt
- `NotificationBadge` — count badge overlay
- `NotificationList` — list of notification rows
- `NotificationCenter` — full notification panel
- `OnboardingChecklist` — step-by-step onboarding checklist
- `NpsSurvey` — Net Promoter Score widget
- `FeedbackWidget` — thumbs-up/thumbs-down feedback
- `CookieConsent` — GDPR cookie consent banner
- `Tag` — removable tag chip
- `SimpleIcon` — wrapper for SimpleIcons brand logos

---

## Charts

All charts are built on Recharts. Colors resolve from CSS custom properties
(`--chart-1` through `--chart-6`) and automatically match whichever theme is active.

### BarChart / BarChartCard / StackedBarChart
```tsx
import { BarChart, BarChartCard, StackedBarChart } from '@fabrk/components'

<BarChart
  data={[
    { month: 'Jan', revenue: 4000, costs: 2400 },
    { month: 'Feb', revenue: 3000, costs: 1398 },
  ]}
  xAxisKey="month"
  series={[
    { dataKey: 'revenue', name: 'Revenue' },
    { dataKey: 'costs', name: 'Costs' },
  ]}
  height={300}
  showLegend
  showGrid
/>
```
Key props: `data`, `xAxisKey`, `series[]` (`dataKey`, `name?`, `color?`, `stackId?`, `radius?`),
`height`, `horizontal`, `colorByIndex`, `barSize`, `yAxisFormatter`, `tooltipFormatter`.

`BarChartCard` wraps the chart in a terminal-style card with `title`, `description`, `code` props.
`StackedBarChart` takes `stackKeys: string[]` instead of `series`.

### LineChart / LineChartCard
```tsx
<LineChart
  data={weekData}
  xAxisKey="date"
  series={[
    { dataKey: 'users', name: 'Users' },
    { dataKey: 'sessions', name: 'Sessions', dashed: true },
  ]}
  height={280}
/>
```
Series extras: `dashed`, `dot`, `strokeWidth`, `color`.

### Other Chart Types
| Component | Description | Key Props |
|-----------|-------------|-----------|
| `AreaChart` / `AreaChartCard` | Filled line chart | `series[].fillOpacity` |
| `StackedAreaChart` | Stacked area variant | `stackKeys[]`, `stackLabels[]` |
| `DonutChart` / `DonutChartCard` | Donut with center label | `data: { name, value }[]`, `centerLabel` |
| `PieChart` / `PieChartCard` | Standard pie | `data: { name, value }[]` |
| `FunnelChart` | Conversion funnel | `data: { name, value }[]` |
| `Gauge` | Semi-circle gauge | `value`, `min`, `max`, `label` |
| `Sparkline` | Inline mini line chart | `data`, `width`, `height` |

---

## Dashboard

`DashboardShell` is the primary layout component for dashboard applications.
It renders a responsive sidebar with mobile hamburger, user footer, and a scrollable main area.

```tsx
'use client'
import {
  DashboardShell, DashboardHeader, StatsGrid, KpiCard, BarChart
} from '@fabrk/components'
import { LayoutDashboard, Settings } from 'lucide-react'

export default function DashboardPage() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" />, href: '/dashboard' },
        { id: 'settings', label: 'Settings', icon: <Settings className="size-4" />, href: '/dashboard/settings' },
      ]}
      activeItemId="overview"
      user={{ name: 'Jason', email: 'jason@acme.com', tier: 'pro' }}
      logo={<span className="text-accent text-xl">#</span>}
      title="Acme"
      onSignOut={() => signOut()}
    >
      <DashboardHeader title="Overview" />

      <div className="p-6 space-y-6">
        <StatsGrid items={[
          { label: 'Total Users', value: '12,840', change: '+8%' },
          { label: 'Revenue', value: '$48,200', change: '+12%' },
          { label: 'Churn Rate', value: '2.1%', change: '-0.3%' },
        ]} />

        <KpiCard
          title="Monthly Revenue"
          value="$48,200"
          change={12}
          trend="up"
          subtitle="vs last month"
        />

        <BarChart
          data={revenueData}
          xAxisKey="month"
          series={[{ dataKey: 'revenue', name: 'Revenue' }]}
          height={280}
        />
      </div>
    </DashboardShell>
  )
}
```

`DashboardShellProps` reference:

| Prop | Type | Notes |
|------|------|-------|
| `sidebarItems` | `DashboardNavItem[]` | `id`, `label`, `icon?`, `href?`, `badge?`, `active?` |
| `user` | `DashboardUser` | `name?`, `email?`, `image?`, `tier?` |
| `logo` | `ReactNode` | Logo element rendered in sidebar header |
| `title` | `string` | App name shown in sidebar header (default: `'Dashboard'`) |
| `activeItemId` | `string` | Highlights matching nav item |
| `onItemClick` | `(item: DashboardNavItem) => void` | Nav click handler |
| `onSignOut` | `() => void` | Sign-out button in user footer |
| `linkComponent` | `ElementType` | Custom link (e.g., Next.js `Link`) defaults to `'a'` |

`KpiCardProps`: `title`, `value`, `change?` (number), `trend?` (`up | down | neutral`), `subtitle?`, `icon?`

---

## AI Components

Full chat UI with model selector, conversation sidebar, and file attachment support.

```tsx
'use client'
import { AiChat } from '@fabrk/components'

<AiChat
  models={[
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', provider: 'Anthropic', maxTokens: 200000 },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', maxTokens: 128000 },
  ]}
  defaultModelId="claude-sonnet-4-20250514"
  conversations={[
    { id: 'c1', title: 'Project planning', updatedAt: Date.now() },
  ]}
  onSendMessage={async (message, attachments, modelId) => {
    const text = await callYourAIBackend(message, modelId)
    return { id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: Date.now() }
  }}
  onNewConversation={() => router.push('/chat/new')}
  onSelectConversation={(id) => router.push(`/chat/${id}`)}
/>
```

Compose individual pieces when you need custom layouts:
- `AiChatMessageList` — bubble list; props: `messages: Message[]`, `isLoading: boolean`
- `AiChatInput` — textarea + send; props: `onSend`, `onStop`, `isLoading`, `models`, `selectedModelId`, `onModelChange`
- `AiChatSidebar` — conversation list; props: `conversations`, `activeId`, `onSelect`, `onNew`
- `AiChatAttachmentPreview` — file attachment chip

Exported types: `Message`, `Conversation`, `Model`, `Attachment`

---

## Admin Components

```tsx
import { AuditLog, SystemHealthWidget, AdminMetricsCard } from '@fabrk/components'

<AuditLog
  entries={[
    { id: '1', action: 'user.login', actor: 'jason@acme.com', timestamp: new Date(), status: 'success' },
  ]}
  pageSize={20}
/>

<SystemHealthWidget
  metrics={[
    { name: 'API Latency', value: 42, unit: 'ms', status: 'healthy' },
    { name: 'Error Rate', value: 0.3, unit: '%', status: 'healthy' },
    { name: 'Queue Depth', value: 1240, unit: '', status: 'warning' },
  ]}
/>

<AdminMetricsCard title="Active Users" value="3,241" change={5} changeLabel="vs last week" />
```

Exported types: `AuditLogEntry`, `AuditAction`, `SystemHealthMetric`

---

## Security Components

MFA setup and display for user account security pages.

```tsx
import { MfaCard, MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

<MfaCard
  twoFactorEnabled={user.mfaEnabled}
  isEnabling2FA={false}
  isDisabling2FA={false}
  onEnable2FA={() => setShowSetup(true)}
  onDisable2FA={handleDisableMfa}
/>

<MfaSetupDialog
  open={showSetup}
  onOpenChange={setShowSetup}
  qrCodeUrl={totpQrUrl}
  secret={totpSecret}
  onVerify={async (code) => verifyTOTP(code)}
/>

<BackupCodesModal
  open={showCodes}
  onOpenChange={setShowCodes}
  codes={backupCodes}
  onRegenerate={async () => regenerateBackupCodes()}
/>
```

---

## Organization Components

```tsx
import { OrgSwitcher, MemberCard, TeamActivityFeed } from '@fabrk/components'

<OrgSwitcher
  organizations={[{ id: 'org-1', name: 'Acme Corp', slug: 'acme', plan: 'pro' }]}
  currentOrgId="org-1"
  onSwitch={(org) => router.push(`/org/${org.slug}`)}
  onCreateOrg={() => router.push('/org/new')}
/>

<MemberCard
  member={{ id: 'm1', name: 'Alice', email: 'alice@acme.com', role: 'admin', status: 'active' }}
  onRemove={(member) => removeMember(member.id)}
  onChangeRole={(member, role) => updateRole(member.id, role)}
/>

<TeamActivityFeed
  activities={[
    { id: 'a1', type: 'member_joined', actor: 'Alice', timestamp: new Date() },
  ]}
/>
```

Exported types: `OrgSwitcherOrganization`, `Member`, `TeamActivity`, `ActivityType`

---

## SEO Components

```tsx
import { SchemaScript, Breadcrumbs } from '@fabrk/components'

// JSON-LD structured data — safe in server components
<SchemaScript schema={{ '@type': 'WebPage', name: 'Dashboard' }} />

// Schema.org breadcrumb trail
<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }]} />
```

---

## Hooks

```tsx
import { useToast, useDebounce, useLocalStorage, useMediaQuery } from '@fabrk/components'

const { toast } = useToast()
toast({ title: 'Saved', description: 'Your changes were saved.' })

const debouncedQuery = useDebounce(searchQuery, 300)
const [theme, setTheme] = useLocalStorage('theme', 'dark')
const isMobile = useMediaQuery('(max-width: 768px)')
```

---

## Utilities

```tsx
import { cn, sanitizeHref } from '@fabrk/components'

cn('border', isActive && 'border-primary', mode.radius)
```

---

## Design System Rules

When writing custom components alongside these, apply the same rules:

```tsx
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/components'

// Full border — always pair with mode.radius
<div className={cn('border border-border', mode.radius)}>

// Partial border — never add mode.radius
<div className="border-t border-border">

// Use semantic tokens only
className="bg-card text-foreground"        // correct
className="bg-white text-gray-900"         // breaks all themes
```

Button text and headings use UPPERCASE. Body text uses normal sentence case.
