# @fabrk/components — AGENTS.md

> 70+ production-ready UI components, charts, and feature components

## Overview

| | |
|---|---|
| **Package** | `@fabrk/components` |
| **Language** | TypeScript + React |
| **Components** | 70+ UI components, 8 chart types, AI chat, admin, security, notifications, org, SEO |
| **Styling** | Tailwind CSS + design tokens from `@fabrk/design-system` |

## Critical Rules

1. **USE EXISTING COMPONENTS** — Check exports before creating new ones
2. **USE DESIGN TOKENS** — `bg-primary`, `text-foreground`, never `bg-blue-500`
3. **USE `mode` FROM DESIGN SYSTEM** — `mode.radius` on full borders, `mode.font` for text
4. **TERMINAL AESTHETIC** — UPPERCASE labels/buttons, bracket notation `[STATUS]`

## Component Categories

### UI Components (50+)
Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Checkbox, CodeBlock, Command, Container, DataTable, DatePicker, Dialog, DropdownMenu, EmptyState, Form, FormError, Heatmap, Input, InputGroup, InputNumber, InputOtp, InputPassword, InputSearch, KpiCard, Label, Loading, NotificationBadge, NotificationList, Pagination, Popover, PricingCard, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Sidebar, SimpleIcon, Slider, StatCard, StyledTabs, Switch, Table, Tabs, TerminalSpinner, Textarea, Toaster, Tooltip, Typewriter

### Charts (8)
AreaChart, BarChart, DonutChart, FunnelChart, Gauge, LineChart, PieChart, Sparkline

### AI Chat Components
| Component | Description |
|-----------|-------------|
| `AiChat` | Full chat UI with sidebar, messages, input |
| `ChatInput` | Input with model selector, attachments, send/stop |
| `ChatMessageList` | Message display with avatars, copy, streaming |
| `ChatSidebar` | Conversation list with new chat button |
| `ChatAttachmentPreview` | File attachment badges |

### Notification Center
| Component | Description |
|-----------|-------------|
| `NotificationCenter` | Dropdown with grouping, mark read, delete |

### Admin Components
| Component | Description |
|-----------|-------------|
| `AuditLog` | Timeline view with search, filter, export CSV |
| `AdminMetricsCard` | Metric card with trend indicators |
| `SystemHealthWidget` | System health with color-coded thresholds |

### Security Components
| Component | Description |
|-----------|-------------|
| `MfaCard` | 2FA status card |
| `MfaSetupDialog` | Multi-step 2FA setup wizard |
| `BackupCodesModal` | Backup code display with copy/download |

### Organization Components
| Component | Description |
|-----------|-------------|
| `OrgSwitcher` | Organization dropdown switcher |
| `MemberCard` | Member display with role actions |
| `TeamActivityFeed` | Activity timeline |

### SEO Components
| Component | Description |
|-----------|-------------|
| `SchemaScript` | JSON-LD structured data |
| `Breadcrumbs` | SEO breadcrumbs with schema |

### Error Boundary
| Component | Description |
|-----------|-------------|
| `ErrorBoundary` | React error boundary with terminal UI |

## Key Design Decisions

- **Callback props** — Components accept callbacks (`onSendMessage`, `onSwitchOrg`) instead of making API calls directly
- **Render props** for optional deps — e.g., `renderQrCode` instead of requiring `qrcode.react`
- **No Next.js dependency** — Uses `linkComponent` props instead of `next/link`
- **Framework-agnostic** — Pure React components, usable in any React framework

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS, "use client" banner)
pnpm dev          # Watch mode
```
