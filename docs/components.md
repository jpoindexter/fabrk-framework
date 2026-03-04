# @fabrk/components — UI Component Library

109+ production-ready React components, 10 chart types, AI chat UI, admin panels, security flows, organization management, and 15 utility hooks.

```bash
pnpm add @fabrk/components @fabrk/design-system @fabrk/core
```

---

## Design system rules

Before using components, understand the two rules that affect every component:

### Rule 1: mode.radius on full borders only

The `mode` object from `@fabrk/design-system` controls theming at runtime through CSS variables. Its `radius` property holds the border-radius class for the current theme.

```tsx
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

// Full border (border, border-2) → must add mode.radius
<div className={cn('border border-border', mode.radius)}>

// Partial border (border-t, border-b, etc.) → never add mode.radius
<div className="border-t border-border">

// Table cells → never add mode.radius
<td className="border-b border-border px-4 py-2">

// Switch → always rounded-full, not mode.radius
<div className="rounded-full">
```

### Rule 2: Design tokens, not hardcoded colors

The 18 themes work by overriding CSS variables. Hardcoded Tailwind colors (`bg-blue-500`, `text-gray-700`) ignore the variable system and break when the user switches themes.

Correct tokens:

```
Backgrounds:  bg-background  bg-card  bg-muted  bg-primary  bg-secondary  bg-destructive
Text:         text-foreground  text-muted-foreground  text-primary  text-destructive  text-success
Borders:      border-border  border-primary  border-destructive
```

The `mode.color` object maps semantic names to the correct token classes:

```tsx
import { mode } from '@fabrk/design-system'

// Instead of guessing token names:
<p className={mode.color.text.muted}>   // 'text-muted-foreground'
<div className={mode.color.bg.danger}>  // 'bg-destructive'
```

### Text casing

All UI text follows terminal aesthetic conventions. Don't deviate from this in components:

- Labels, badges, headlines → UPPERCASE
- Buttons → UPPERCASE with `>` prefix: `> SUBMIT`
- Body text → Normal sentence case

---

## Next.js setup

Components are pre-bundled with `"use client"` at the top of every output file (via tsup banner). This means you can import them directly in Server Components without adding `"use client"` to a wrapper — they handle it themselves.

```tsx
// app/dashboard/page.tsx — Server Component
import { DashboardShell, DashboardHeader, StatsGrid } from '@fabrk/components'
import { ThemeProvider } from '@fabrk/design-system'

export default function Page() {
  return (
    <ThemeProvider defaultTheme="terminal">
      <DashboardShell sidebarItems={[...]} user={user}>
        <DashboardHeader title="OVERVIEW" />
        <StatsGrid items={[...]} />
      </DashboardShell>
    </ThemeProvider>
  )
}
```

You still need to add `@fabrk/components` to your `tailwind.config.ts` content paths so Tailwind scans the component classes:

```ts
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './node_modules/@fabrk/components/dist/**/*.{js,mjs}',
    './node_modules/@fabrk/design-system/dist/**/*.{js,mjs}',
  ],
}
```

---

## Dashboard layout

The most commonly needed pattern: full-page layout with a collapsible sidebar, responsive on mobile.

```tsx
import { DashboardShell, DashboardHeader, TierBadge } from '@fabrk/components'
import { GitBranch, Settings, BarChart } from 'lucide-react'

export default function Dashboard({ children }) {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'OVERVIEW', icon: <BarChart size={16} />, href: '/dashboard' },
        { id: 'repos', label: 'REPOS', icon: <GitBranch size={16} />, href: '/dashboard/repos' },
        { id: 'settings', label: 'SETTINGS', icon: <Settings size={16} />, href: '/dashboard/settings', badge: 2 },
      ]}
      activeItemId="overview"
      user={{ name: 'Jason', email: 'jason@example.com', image: '/avatar.jpg', tier: 'pro' }}
      logo={<span className="text-accent font-bold text-xl">#</span>}
      onSignOut={() => signOut()}
      linkComponent={Link}  // Pass your router's Link for client-side nav
    >
      {children}
    </DashboardShell>
  )
}
```

`DashboardShell` handles:
- Fixed sidebar on desktop, slide-over on mobile
- User avatar + tier badge in the footer
- Mobile hamburger toggle
- The active item is highlighted automatically via `activeItemId`

For the header inside the shell:

```tsx
<DashboardHeader
  title="REPOSITORIES"
  description="Your code repositories"
  actions={<Button>+ NEW REPO</Button>}
/>
```

---

## Stats grid

```tsx
import { StatsGrid } from '@fabrk/components'
import { FileIcon, BoxIcon } from 'lucide-react'

<StatsGrid
  columns={4}  // 2 | 3 | 4
  items={[
    { label: 'FILES', value: 1572, icon: <FileIcon size={16} /> },
    { label: 'COMPONENTS', value: 279, change: '+12%', icon: <BoxIcon size={16} /> },
    { label: 'API ROUTES', value: 46, icon: <RouteIcon size={16} /> },
    { label: 'COMPLEXITY', value: 'B+', icon: <GaugeIcon size={16} /> },
  ]}
/>
```

Numbers >= 1000 are automatically formatted as `1.5K`, >= 1000000 as `1.5M`. The `change` field renders in `text-success`.

---

## Data table

```tsx
import { DataTable } from '@fabrk/components'
import type { ColumnDef } from '@fabrk/components'

interface User {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  createdAt: Date
}

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'email', header: 'EMAIL' },
  {
    accessorKey: 'status',
    header: 'STATUS',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>
        {row.original.status.toUpperCase()}
      </Badge>
    ),
  },
]

<DataTable
  columns={columns}
  data={users}
  searchKey="email"
  onRowClick={(row) => router.push(`/users/${row.id}`)}
/>
```

DataTable includes built-in filtering, sorting, and pagination.

---

## Charts

All charts use Recharts internally and share `ChartCard` (wrapper) and `useChartTooltip` (tooltip logic). Never duplicate tooltip markup in custom charts — import from `@fabrk/components`.

```tsx
import {
  BarChart, AreaChart, LineChart, PieChart, DonutChart,
  FunnelChart, Gauge, Sparkline,
} from '@fabrk/components'

// Bar chart
<BarChart
  data={[
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
  ]}
  xKey="name"
  yKey="value"
  title="MONTHLY REVENUE"
  height={300}
/>

// Multi-series area chart
<AreaChart
  data={weeklyData}
  xKey="date"
  series={[
    { key: 'users', label: 'USERS', color: 'var(--color-primary)' },
    { key: 'sessions', label: 'SESSIONS', color: 'var(--color-success)' },
  ]}
  title="WEEKLY ACTIVITY"
/>

// Donut chart with legend
<DonutChart
  data={[
    { name: 'TypeScript', value: 60 },
    { name: 'Python', value: 25 },
    { name: 'Go', value: 15 },
  ]}
  title="LANGUAGE BREAKDOWN"
/>

// Sparkline (tiny inline chart, no axes)
<Sparkline data={[10, 40, 20, 60, 30, 80]} width={100} height={30} />

// Gauge (0-100)
<Gauge value={72} label="UPTIME" max={100} />
```

Chart colors are pulled from `getChartColors(n)` in `@fabrk/design-system` — they follow the active theme so they change automatically when the user switches themes.

---

## KPI card

```tsx
import { KPICard } from '@fabrk/components'
import { TrendingUp } from 'lucide-react'

<KPICard
  title="MONTHLY REVENUE"
  value="$48,291"
  change="+12.5%"
  trend="up"
  icon={<TrendingUp size={16} />}
  description="vs last month"
/>
```

---

## AI chat components

The AI chat package (`AiChat`, `AiChatInput`, `AiChatMessageList`, `AiChatSidebar`) is a full chat interface. It is a display layer only — it does not call any LLM directly. Wire it up to `useAgent` from the `fabrk` runtime:

```tsx
import { AiChat } from '@fabrk/components'
import { useAgent } from 'fabrk'

function SupportChat() {
  const agent = useAgent('support')

  return (
    <AiChat
      messages={agent.messages}
      isStreaming={agent.isStreaming}
      onSend={agent.send}
      onStop={agent.stop}
      toolCalls={agent.toolCalls}
      error={agent.error}
      placeholder="ASK ANYTHING..."
      showToolCalls={true}
    />
  )
}
```

For a sidebar chat (collapsed/expanded panel):

```tsx
<AiChatSidebar
  agentName="assistant"
  defaultOpen={false}
  title="AI ASSISTANT"
/>
```

---

## Tier badge

Shows a user's subscription tier. Used in sidebar footers, profile cards, etc.

```tsx
import { TierBadge } from '@fabrk/components'

<TierBadge tier="pro" />     // [PRO]
<TierBadge tier="free" />    // [FREE]
<TierBadge tier="enterprise" /> // [ENTERPRISE]
```

---

## Security components

Pre-built MFA setup flow:

```tsx
import { MfaCard, MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

// Overview card showing MFA status
<MfaCard
  isEnabled={user.mfaEnabled}
  onSetup={() => setShowSetup(true)}
  onDisable={handleDisable}
/>

// Setup dialog — shows QR code and OTP verification
<MfaSetupDialog
  open={showSetup}
  onOpenChange={setShowSetup}
  secret={totpSecret}
  qrCodeUrl={qrCodeUrl}
  onVerify={async (otp) => {
    const valid = await verifyTotp(user.id, otp)
    return valid
  }}
  onComplete={(backupCodes) => setShowBackupCodes(true)}
/>

// Backup codes display
<BackupCodesModal
  open={showBackupCodes}
  codes={backupCodes}
  onClose={() => setShowBackupCodes(false)}
/>
```

`MfaSetupDialog` accepts a `renderQrCode` prop if you want to use a specific QR code library. Without it, it renders a text fallback.

---

## Organization components

```tsx
import { OrgSwitcher, MemberCard, TeamActivityFeed } from '@fabrk/components'

// Organization switcher dropdown
<OrgSwitcher
  organizations={[
    { id: 'org-1', name: 'Acme Corp', image: '/acme.png', role: 'ADMIN' },
    { id: 'org-2', name: 'Side Project', role: 'OWNER' },
  ]}
  currentOrgId="org-1"
  onSwitch={(orgId) => router.push(`/orgs/${orgId}`)}
  onCreateNew={() => router.push('/orgs/new')}
/>

// Member card
<MemberCard
  member={{ id: 'm1', name: 'Alice', email: 'alice@example.com', role: 'admin', avatarUrl: '/alice.jpg' }}
  onRoleChange={handleRoleChange}
  onRemove={handleRemove}
/>

// Activity feed
<TeamActivityFeed
  activities={[
    { id: '1', type: 'member_joined', actor: 'Bob', target: 'Acme Corp', timestamp: new Date() },
    { id: '2', type: 'role_changed', actor: 'Alice', target: 'Bob', detail: 'member → admin', timestamp: new Date() },
  ]}
/>
```

---

## Admin components

```tsx
import { AuditLog, AdminMetricsCard, SystemHealthWidget } from '@fabrk/components'

<AuditLog
  entries={auditEvents}
  onFilter={(action) => setFilter(action)}
/>

<SystemHealthWidget
  metrics={[
    { name: 'API', status: 'healthy', latencyMs: 42 },
    { name: 'Database', status: 'degraded', latencyMs: 380 },
    { name: 'Cache', status: 'healthy', latencyMs: 2 },
  ]}
/>
```

---

## Notification center

```tsx
import { NotificationCenter } from '@fabrk/components'

<NotificationCenter
  items={notifications}
  onMarkRead={(id) => markRead(id)}
  onMarkAllRead={markAllRead}
  onDelete={(id) => deleteNotification(id)}
/>
```

---

## Utility hooks

All hooks are SSR-safe (check `typeof window !== 'undefined'` internally).

```tsx
import {
  useMediaQuery, useIsMobile, useIsDesktop,
  useDebounce, useLocalStorage,
  useClickOutside, useCopyToClipboard,
  useBodyScrollLock, useIntersectionObserver,
  useWindowSize, usePrevious,
  useListKeyboardNav, useViewHistory,
} from '@fabrk/components'

// Responsive breakpoints
const isMobile = useIsMobile()          // < 768px
const isDesktop = useIsDesktop()        // >= 1024px
const isWide = useMediaQuery('(min-width: 1440px)')

// Debounce search input
const [query, setQuery] = useState('')
const debouncedQuery = useDebounce(query, 300)

// localStorage with SSR guard + type safety
const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('theme', 'dark')

// Close a dropdown on outside click
const ref = useRef<HTMLDivElement>(null)
useClickOutside(ref, () => setOpen(false))

// Clipboard with timed success state
const { copy, copied } = useCopyToClipboard()
<button onClick={() => copy(codeBlock)}>{copied ? 'COPIED' : '> COPY'}</button>

// Lock body scroll when modal is open
useBodyScrollLock(isModalOpen)

// Intersection observer (lazy loading, infinite scroll)
const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.5 })
<div ref={ref}>{isIntersecting ? <HeavyComponent /> : null}</div>

// Arrow key + j/k navigation for lists
useListKeyboardNav({
  items: filteredResults,
  activeItem: selected,
  onSelect: setSelected,
  onConfirm: (item) => router.push(`/items/${item.id}`),
  keyFn: (item) => item.id,
  vimKeys: true,
})

// Track recently viewed items
const { items, add, clear } = useViewHistory()
add({ id: 'doc-1', label: 'Getting Started', href: '/docs/getting-started' })
```

---

## Other notable components

| Component | Use case |
|-----------|---------|
| `CodeBlock` | Syntax-highlighted code with copy button |
| `Terminal*` | `TerminalSpinner` for loading states in terminal-style UIs |
| `LogStream` | Streaming log output with ANSI color support |
| `TokenCounter` | Shows token count and estimated cost for text input |
| `UsageBar` | Progress bar for quota/usage display |
| `JsonViewer` | Collapsible JSON tree with syntax highlighting |
| `AsciiProgressBar` | Text-mode progress bar `[████████░░] 80%` |
| `StatusPulse` | Animated dot indicator for connection/health status |
| `OnboardingChecklist` | Step-by-step checklist with completion tracking |
| `PricingCard` | Subscription tier card with features list |
| `FeedbackWidget` | Thumbs up/down + optional comment |
| `NpsSurvey` | Net Promoter Score widget |
| `StarRating` | 1-5 star rating input |
| `CookieConsent` | GDPR cookie banner with accept/reject |
| `UpgradeCta` | Locked-feature CTA with upgrade prompt |
| `InputOtp` | 6-digit OTP input with auto-advance |
| `DatePicker` | Full date/time picker with presets and month-only mode |
| `Heatmap` | Activity heatmap (like GitHub contributions) |
| `Typewriter` | Animated text reveal |
| `Breadcrumbs` (SEO) | Schema.org-annotated breadcrumb navigation |
| `SchemaScript` | Injects JSON-LD structured data |
| `ErrorBoundary` | React error boundary with fallback UI |

---

## Web components

For embedding in non-React environments (vanilla JS, Svelte, Vue):

```ts
import { defineWebComponent } from '@fabrk/components'
import { Button } from '@fabrk/components'

defineWebComponent('fabrk-button', Button)
```

```html
<fabrk-button variant="default" size="sm">CLICK ME</fabrk-button>
```

Each web component creates an isolated Shadow DOM with its own React root. Props are passed as HTML attributes.
