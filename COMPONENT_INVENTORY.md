# COMPONENT INVENTORY

Complete inventory of all components exported from `@fabrk/components`. All components follow the terminal aesthetic and design system rules documented in `DESIGN_SYSTEM_RULES.md`.

**Import path:** `import { ComponentName } from '@fabrk/components'`

**Total:** 109 components + 15 hooks across 9 categories.

---

## UI Components (75)

### Core Primitives

| Component | Description | Key Props |
|---|---|---|
| `Button` | Primary interactive element with loading state and 8 variants | `variant` (default/destructive/outline/secondary/ghost/link/primaryCta/secondaryCta), `size`, `loading` |
| `Badge` | Inline status/label chip | `variant` (default/secondary/destructive/outline) |
| `Avatar` / `AvatarImage` / `AvatarFallback` | User avatar with image and initials fallback | `src`, `alt`, fallback content |
| `Label` | Accessible form label | `htmlFor`, `className` |
| `Separator` | Horizontal or vertical divider | `orientation` (horizontal/vertical) |
| `Tooltip` / `TooltipTrigger` / `TooltipContent` / `TooltipProvider` | Hover tooltip using Radix | `content`, `side`, `delayDuration` |
| `SimpleIcon` | Renders an SVG icon from simple-icons by brand slug | `slug`, `size`, `color` |

### Layout

| Component | Description | Key Props |
|---|---|---|
| `Container` | Responsive max-width content wrapper | `size` (sm/md/lg/xl/full), `className` |
| `DashboardShell` | Full dashboard layout with collapsible sidebar, mobile nav, and user footer | `sidebarItems`, `user`, `logo`, `onSignOut` |
| `DashboardHeader` | Page-level header with title, subtitle, and action slot | `title`, `subtitle`, `actions`, `code` |
| `PageHeader` | Section header with integrated search bar and filter tabs | `title`, `onSearchChange`, `tabs`, `totalCount` |
| `Card` / `CardHeader` / `CardContent` / `CardFooter` | Terminal-style card container with bracketed header | `tone` (default/success/warning/danger), `code`, `title` |

### Forms and Inputs

| Component | Description | Key Props |
|---|---|---|
| `Input` | Standard text input with terminal styling | `type`, `placeholder`, `disabled` |
| `InputGroup` | Input with prepended/appended addons | `prefix`, `suffix` |
| `InputNumber` | Numeric input with increment/decrement controls | `value`, `onChange`, `min`, `max`, `step` |
| `InputPassword` | Password input with visibility toggle | `value`, `onChange`, `showStrength` |
| `InputSearch` | Search input with clear button and optional debounce | `value`, `onChange`, `placeholder`, `debounceMs` |
| `InputOtp` | One-time-password digit input | `length`, `value`, `onChange`, `autoFocus` |
| `Textarea` | Multi-line text input | `rows`, `maxLength`, `placeholder` |
| `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` / `SelectValue` | Styled dropdown select via Radix | `value`, `onValueChange`, `placeholder` |
| `Checkbox` | Checked/unchecked control | `checked`, `onCheckedChange`, `disabled` |
| `RadioGroup` / `RadioGroupItem` | Radio button group | `value`, `onValueChange`, `orientation` |
| `Switch` | Toggle switch — always `rounded-full` | `checked`, `onCheckedChange`, `disabled` |
| `Slider` | Range/value slider | `value`, `onValueChange`, `min`, `max`, `step` |
| `Form` / `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage` / `FormDescription` | React Hook Form integration wrappers | `name`, `control`, `render` |
| `FormError` | Standalone form error message display | `error`, `className` |
| `Calendar` | Date picker calendar grid | `selected`, `onSelect`, `mode`, `disabled` |
| `DatePicker` | Calendar in a popover trigger | `selected`, `onSelect`, `placeholder` |

### Overlays and Popovers

| Component | Description | Key Props |
|---|---|---|
| `Dialog` / `DialogTrigger` / `DialogContent` / `DialogHeader` / `DialogTitle` / `DialogDescription` | Modal dialog via Radix | `open`, `onOpenChange` |
| `AlertDialog` / `AlertDialogTrigger` / `AlertDialogContent` / `AlertDialogAction` / `AlertDialogCancel` | Confirmation dialog | `open`, `onOpenChange` |
| `Sheet` / `SheetTrigger` / `SheetContent` / `SheetHeader` / `SheetTitle` | Side panel drawer | `open`, `onOpenChange`, `side` (left/right/top/bottom) |
| `Popover` / `PopoverTrigger` / `PopoverContent` | Floating content panel | `open`, `onOpenChange`, `align`, `side` |
| `DropdownMenu` / `DropdownMenuTrigger` / `DropdownMenuContent` / `DropdownMenuItem` / `DropdownMenuLabel` / `DropdownMenuSeparator` | Context/action dropdown | `open`, `onOpenChange`, `align` |
| `Command` / `CommandInput` / `CommandList` / `CommandItem` / `CommandGroup` / `CommandEmpty` | Command palette / combobox | `value`, `onValueChange`, `filter` |

### Navigation

| Component | Description | Key Props |
|---|---|---|
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Standard tab switcher | `value`, `onValueChange` |
| `StyledTabs` | Tabs with active indicator underline animation | `tabs`, `value`, `onChange` |
| `SegmentedControl` | Button-group style tab switcher | `options`, `value`, `onChange`, `size` |
| `Breadcrumb` / `BreadcrumbItem` / `BreadcrumbLink` / `BreadcrumbSeparator` | Navigation breadcrumb trail | `items`, `separator` |
| `Sidebar` / `SidebarProvider` / `SidebarTrigger` / `SidebarContent` / `SidebarItem` | Full sidebar navigation component | `open`, `onOpenChange`, `items` |
| `Pagination` / `PaginationContent` / `PaginationItem` / `PaginationNext` / `PaginationPrevious` | Page-based pagination | `currentPage`, `totalPages`, `onPageChange` |
| `Accordion` / `AccordionItem` / `AccordionTrigger` / `AccordionContent` | Collapsible content sections | `type` (single/multiple), `value` |
| `ScrollArea` | Styled scrollable container with custom scrollbar | `className`, `orientation` |

### Data Display

| Component | Description | Key Props |
|---|---|---|
| `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` / `TableFooter` | Basic styled table primitives | Standard HTML table attributes |
| `DataTable` | Full-featured table with sorting, filtering, pagination, row selection (TanStack Table) | `columns`, `data`, `searchKey`, `onRowClick` |
| `KpiCard` | Metric card with value, change percentage, and trend indicator | `title`, `value`, `change`, `trend`, `icon` |
| `StatCard` | Compact stat display with label and value | `label`, `value`, `icon`, `change` |
| `StatsGrid` | Responsive grid of stat items with optional icons and change indicators | `items`, `columns` (2/3/4) |
| `Heatmap` | 2D grid visualization with color intensity encoding | `data`, `cellSize`, `colorScale`, `onCellClick` |
| `PricingCard` | Terminal-style pricing display for checkout and landing pages | `price`, `regularPrice`, `highlights`, `children` |
| `Progress` | Linear progress bar | `value`, `max`, `className` |
| `ASCIIProgressBar` | ASCII block-character progress bar for terminal aesthetic | `value`, `max`, `size`, `label` |
| `UsageBar` | Labeled progress bar with color variants for quota display | `value`, `max`, `label`, `variant` |
| `JsonViewer` | Interactive collapsible JSON tree viewer | `data`, `defaultExpandDepth` |
| `CodeBlock` | Syntax-highlighted code snippet with copy button | `code`, `language`, `showLineNumbers` |
| `LogStream` | Auto-scrolling terminal log viewer with level-colored output | `entries`, `maxHeight`, `showTimestamps` |
| `TokenCounter` | AI token usage display with limit indicators | `value`, `max`, `label`, `variant` (compact/default/detailed) |

### Feedback and Status

| Component | Description | Key Props |
|---|---|---|
| `Alert` / `AlertTitle` / `AlertDescription` | Inline alert/notification banner | `variant` (default/destructive) |
| `Toaster` | Toast notification container (Sonner-based) | `position`, `theme` |
| `Loading` | Spinner / skeleton loading state | `variant`, `size` |
| `TerminalSpinner` | ASCII-style animated loading indicator | `size`, `label` |
| `EmptyState` | Zero-data placeholder with title, description, and action | `title`, `description`, `action`, `icon` |
| `StatusPulse` | Animated pulsing dot for live status display | `status` (online/offline/syncing/error/warning) |
| `NotificationBadge` | Numeric badge overlay for icon buttons | `count`, `max`, `dot`, `variant` |
| `NotificationList` | Scrollable notification item list | `notifications`, `onMarkAsRead`, `onDelete` |
| `ErrorBoundary` | React class error boundary with fallback UI | `children`, `fallback`, `onError`, `resetKeys` |

### User Engagement

| Component | Description | Key Props |
|---|---|---|
| `OnboardingChecklist` | Collapsible task checklist with progress tracking | `tasks`, `onTaskToggle`, `onDismiss` |
| `NPSSurvey` | Net Promoter Score 0–10 survey with optional feedback | `onSubmit`, `onDismiss`, `title` |
| `StarRating` | Interactive or read-only star rating control | `value`, `max`, `onChange`, `readonly`, `size` |
| `FeedbackWidget` | Floating feedback button that expands to a category+message form | `onSubmit`, `position` (bottom-right/bottom-left), `triggerLabel` |
| `UpgradeCTA` | Paywall prompt with configurable variant for inline/card/banner placement | `hiddenCount`, `contentType`, `variant`, `onUpgrade`, `upgradeHref` |
| `CookieConsent` | GDPR cookie consent banner with granular category controls and localStorage persistence | `onAcceptAll`, `onAcceptSelected`, `onRejectAll`, `cookieKey` |
| `TierBadge` | Subscription tier indicator (free/trial/pro/team/enterprise) with icon | `tier`, `showIcon`, `size` |

### Utility UI

| Component | Description | Key Props |
|---|---|---|
| `Tag` | Removable or static tag/chip with size variants | `variant`, `size`, `onRemove` |
| `Typewriter` | Animated typewriter text with cursor blink | `text`, `speed`, `onComplete` |
| `Sparkline` | Inline mini-chart SVG for trend display | `data`, `width`, `height`, `showArea`, `color` |

---

## Charts (11)

All charts are built on Recharts with theme-aware colors via CSS custom properties. Each chart also has a `*Card` wrapper variant that adds a terminal-style header.

| Component | Description | Key Props |
|---|---|---|
| `BarChart` | Vertical or horizontal bar chart with multi-series support | `data`, `xAxisKey`, `series`, `horizontal`, `colorByIndex` |
| `BarChartCard` | `BarChart` wrapped in a terminal card with header | `title`, `code`, `description`, `...BarChartProps` |
| `StackedBarChart` | Bar chart with stacked segments | `data`, `xAxisKey`, `stackKeys`, `stackLabels`, `stackColors` |
| `LineChart` | Multi-series line chart with grid and tooltip | `data`, `xAxisKey`, `series`, `showGrid`, `showLegend` |
| `AreaChart` | Line chart with filled area beneath each series | `data`, `xAxisKey`, `series`, `stacked` |
| `DonutChart` | Ring chart with optional center content and legend | `data`, `size`, `thickness`, `centerContent`, `showLegend` |
| `PieChart` | Full pie chart with segment click handlers | `data`, `size`, `showLabels`, `showPercentages`, `onSegmentClick` |
| `FunnelChart` | Conversion funnel with vertical or horizontal orientation | `data`, `direction`, `showValues`, `showPercentages` |
| `Gauge` | Arc/dial gauge with optional colored segments | `value`, `min`, `max`, `size`, `label`, `unit`, `segments` |
| `Sparkline` | Minimal inline SVG line chart for embedding in tables/cards | `data`, `width`, `height`, `showArea`, `showDots` |

---

## AI Chat Components (5)

Full-featured AI chat interface with conversation management and file attachments.

| Component | Description | Key Props |
|---|---|---|
| `AiChat` | Complete AI chat shell with sidebar, message list, model selector, and input | `models`, `conversations`, `onSendMessage`, `onNewConversation` |
| `AiChatInput` | Chat input with file attachment, model selector, and send/stop controls | `onSend`, `onStop`, `isLoading`, `models`, `selectedModelId` |
| `AiChatMessageList` | Scrollable message thread with user/assistant formatting | `messages`, `isLoading` |
| `AiChatSidebar` | Conversation history sidebar with new chat button | `conversations`, `activeId`, `onSelect`, `onNew` |
| `AiChatAttachmentPreview` | Preview strip for attached files before sending | `attachments`, `onRemove` |

---

## Admin Components (3)

Back-office tooling for SaaS admin panels.

| Component | Description | Key Props |
|---|---|---|
| `AuditLog` | Filterable, searchable audit log timeline with CSV export and detail sheet | `initialLogs`, `onExport` |
| `AdminMetricsCard` | Admin KPI card with variant color coding | `title`, `value`, `change`, `variant` (default/primary/success/warning/danger), `loading` |
| `SystemHealthWidget` | Live system health display (uptime, response time, error rate, requests/min) | `uptime`, `avgResponseTime`, `errorRate`, `requestsPerMinute`, `lastUpdated` |

---

## Security Components (3)

MFA setup and management UI, pre-wired for the `@fabrk/auth` package.

| Component | Description | Key Props |
|---|---|---|
| `MfaCard` | 2FA status card with enable/disable controls | `twoFactorEnabled`, `onEnable2FA`, `onDisable2FA`, `onViewBackupCodes` |
| `MfaSetupDialog` | Step-by-step TOTP setup dialog with QR code and verification | `open`, `qrCodeUri`, `totpSecret`, `onVerify`, `renderQrCode` |
| `BackupCodesModal` | Display and regenerate 2FA backup codes with copy and download | `open`, `codes`, `onRegenerate`, `onCopySuccess` |

---

## Notification Components (1)

| Component | Description | Key Props |
|---|---|---|
| `NotificationCenter` | Grouped notification feed with mark-as-read, delete, and clear-all actions | `notifications`, `onMarkAsRead`, `onMarkAllAsRead`, `onDelete`, `onClearAll`, `groupByDate` |

---

## Organization Components (3)

Multi-tenant organization management UI.

| Component | Description | Key Props |
|---|---|---|
| `OrgSwitcher` | Organization selector dropdown with role display and create option | `organizations`, `currentOrgId`, `onSwitchOrg`, `onCreateOrg` |
| `MemberCard` | Team member display card with action buttons (email, message, edit, remove) | `member`, `variant` (card/compact), `showActions`, `onEmail`, `onRemove` |
| `TeamActivityFeed` | Team activity timeline with icon-coded event types | `activities`, `maxHeight`, `showTimestamp` |

---

## SEO Components (2)

Structured data and navigation helpers for Next.js pages.

| Component | Description | Key Props |
|---|---|---|
| `SchemaScript` | Injects JSON-LD structured data script tags (XSS-safe) | `schema`, `nonce` |
| `Breadcrumbs` | Semantic breadcrumb navigation with embedded BreadcrumbList schema | `items`, `showHome`, `baseUrl`, `linkComponent` |

---

## Hooks (15)

All hooks are re-exported from `@fabrk/components`.

| Hook | Description | Signature |
|---|---|---|
| `useMediaQuery` | Reactive CSS media query detection | `(query: string) => boolean` |
| `useIsMobile` | True when viewport < 768px | `() => boolean` |
| `useIsTablet` | True when viewport 768–1023px | `() => boolean` |
| `useIsDesktop` | True when viewport >= 1024px | `() => boolean` |
| `useDebounce` | Debounces a value by a configurable delay | `<T>(value: T, delay?: number) => T` |
| `useLocalStorage` | Type-safe localStorage with SSR guard | `<T>(key, initialValue) => [T, setter]` |
| `useClickOutside` | Fires callback when clicking outside a ref element | `(ref, handler) => void` |
| `useCopyToClipboard` | Clipboard write with timed `copied` state | `(resetDelay?: number) => { copy, copied }` |
| `useBodyScrollLock` | Locks body scroll (with iOS workaround) | `(isLocked: boolean) => void` |
| `useIntersectionObserver` | Viewport intersection detection | `(options?) => { ref, isIntersecting, entry }` |
| `useWindowSize` | Reactive window dimensions | `() => { width, height }` |
| `usePrevious` | Returns the previous render's value | `<T>(value: T) => T \| undefined` |
| `useListKeyboardNav` | Arrow key + vim key navigation for lists | `(options) => void` |
| `useViewHistory` | Recently viewed items persisted to localStorage | `(key?, max?) => { items, add, clear }` |
| `useCookieConsent` | Read and update cookie consent preferences | `(cookieKey?) => { preferences, hasConsented }` |

---

## Totals by Category

| Category | Count |
|---|---|
| UI Components | 75 |
| Charts | 11 |
| AI Chat | 5 |
| Admin | 3 |
| Security | 3 |
| Notifications | 1 |
| Organization | 3 |
| SEO | 2 |
| Hooks | 15 |
| **Total** | **118** |

---

## Quick Reference: Most Used Components

When building a new page or feature, these are the components you will reach for most often:

```tsx
import {
  // Layout
  DashboardShell, DashboardHeader, PageHeader, Container, Card,

  // Data display
  DataTable, KpiCard, StatsGrid, StatCard, BarChart, LineChart,

  // Forms
  Button, Input, Select, Checkbox, Switch, Form, FormField,

  // Feedback
  Alert, Toaster, Loading, EmptyState, ErrorBoundary,

  // Overlays
  Dialog, Sheet, DropdownMenu, Tooltip,

  // Engagement
  TierBadge, OnboardingChecklist, UpgradeCTA, FeedbackWidget,

  // AI
  AiChat,

  // Security
  MfaCard, MfaSetupDialog,

  // Org
  OrgSwitcher, MemberCard,
} from '@fabrk/components'
```

---

## Source Files

All component source is in `packages/components/src/`:

```
src/
├── ui/              # 75 UI components
├── charts/          # 8 chart types (11 exported components)
├── ai/              # AI chat components
├── admin/           # Admin panel components
├── security/        # MFA/security components
├── notifications/   # Notification center
├── organization/    # Multi-tenant org components
├── seo/             # SEO utilities
├── hooks.ts         # All hooks
└── index.ts         # Barrel export
```
