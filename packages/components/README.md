# @fabrk/components

105+ production-ready UI components and charts for the FABRK framework. Built on Radix UI with a terminal-inspired design system, fully accessible and theme-aware.

## Installation

```bash
npm install @fabrk/components @fabrk/design-system
```

## Usage

### Dashboard Shell

Build a complete dashboard in minutes:

```tsx
import { DashboardShell, DashboardHeader, StatsGrid, KPICard } from '@fabrk/components'

export default function Dashboard() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', href: '/dashboard', icon: '>' },
        { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics', icon: '#' },
      ]}
      user={{ name: 'Jason', email: 'jason@example.com', tier: 'pro' }}
      logo={<span className="text-accent text-xl">#</span>}
      onSignOut={() => signOut()}
    >
      <DashboardHeader title="OVERVIEW" subtitle="Your activity summary" />
      <StatsGrid
        items={[
          { label: 'Total Revenue', value: '$12,450', change: '+12.5%', trend: 'up' },
          { label: 'Active Users', value: '1,234', change: '+5.2%', trend: 'up' },
          { label: 'Conversion Rate', value: '3.2%', change: '-0.8%', trend: 'down' },
        ]}
      />
    </DashboardShell>
  )
}
```

### KPI Cards and Charts

Display metrics and visualizations:

```tsx
import { KPICard, LineChart, BarChart } from '@fabrk/components'

function Metrics() {
  const weekTrend = [
    { date: '2025-01-01', value: 120 },
    { date: '2025-01-02', value: 145 },
    { date: '2025-01-03', value: 132 },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      <KPICard
        title="API Calls"
        value="15,234"
        change="+8.2%"
        trend="up"
        icon=">"
      />
      <div className="col-span-2">
        <LineChart
          data={weekTrend}
          xKey="date"
          yKey="value"
          title="Weekly Activity"
        />
      </div>
      <BarChart
        data={[
          { category: 'Monday', value: 45 },
          { category: 'Tuesday', value: 52 },
          { category: 'Wednesday', value: 48 },
        ]}
        xKey="category"
        yKey="value"
      />
    </div>
  )
}
```

### AI Chat Interface

Add conversational AI to your app:

```tsx
import { ChatInput, ChatMessage, StreamingMessage } from '@fabrk/components'

function ChatInterface() {
  const [messages, setMessages] = useState([])

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
      </div>
      <ChatInput
        onSubmit={(message) => handleSendMessage(message)}
        placeholder="Ask me anything..."
        maxLength={2000}
      />
    </div>
  )
}
```

## Component Categories

### UI Controls (60+ components)
Button, Input, Select, Checkbox, Switch, RadioGroup, Slider, Textarea, DatePicker, Calendar, InputOTP, InputPassword, InputSearch, InputNumber, CodeBlock, Form, Label

### Layout & Navigation (15+ components)
Card, Container, Separator, Tabs, StyledTabs, Accordion, Sheet, Dialog, AlertDialog, Breadcrumb, DropdownMenu, Command, Sidebar, Popover, Tooltip

### Feedback & Display (15+ components)
Alert, Badge, TierBadge, Avatar, Progress, AsciiProgressBar, Loading, Toast, EmptyState, NotificationBadge, NotificationList, StatusPulse, TerminalSpinner, Typewriter, Toaster

### Data & Tables (5+ components)
Table, DataTable, Pagination, ScrollArea, Heatmap

### Dashboard & Metrics (10+ components)
DashboardShell, DashboardHeader, PageHeader, KPICard, StatCard, StatsGrid, SystemHealthWidget, AdminMetricsCard, UsageBar, TokenCounter

### Charts (8 components)
AreaChart, BarChart, LineChart, PieChart, DonutChart, FunnelChart, Gauge, Sparkline

### AI Components (5+ components)
ChatInput, ChatMessage, StreamingMessage, JsonViewer, LogStream

### Security (3 components)
MfaCard, MfaSetupDialog, BackupCodesModal

### Organization (3 components)
OrgSwitcher, MemberCard, TeamActivityFeed

### Admin (3 components)
AuditLog, AdminMetricsCard, SystemHealthWidget

### User Engagement (7+ components)
StarRating, NpsSurvey, FeedbackWidget, UpgradeCta, CookieConsent, OnboardingChecklist, PricingCard

### SEO (2 components)
SchemaScript, Breadcrumbs

## Design System Integration

All components use the `mode` object from `@fabrk/design-system` for theme-aware styling:

```tsx
import { mode } from '@fabrk/design-system'
import { Card, Button } from '@fabrk/components'

// Components automatically apply mode.radius, mode.font
<Card className={cn("border", mode.radius)}>
  <Button className={cn(mode.radius, mode.font)}>
    SUBMIT
  </Button>
</Card>
```

Rules:
- Full borders (`border`, `border-2`) require `mode.radius`
- Partial borders (`border-t`, `border-b`) never use `mode.radius`
- Use semantic tokens (`bg-primary`, `text-foreground`) instead of hardcoded colors

## Features

- **105+ Components** - Comprehensive UI library covering forms, navigation, data display, charts, and specialized features
- **Terminal Aesthetic** - Monospace fonts, uppercase buttons, bracket labels, and ASCII art inspired design
- **Design System** - 18 built-in themes with runtime CSS variable switching via `@fabrk/design-system`
- **Radix UI Primitives** - Built on battle-tested, accessible component primitives
- **Fully Typed** - Complete TypeScript definitions for all components and props
- **Callback-Based** - Components accept callbacks instead of making API calls (composable, testable)
- **Tree-Shakeable** - Import only what you need for optimal bundle size
- **Accessible** - WCAG 2.1 Level AA compliance with ARIA attributes
- **Next.js App Router** - Client components with `"use client"` directive for Server Component compatibility

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
