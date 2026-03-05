'use client'

import {
  KpiCard,
  Card,
  CardHeader,
  CardContent,
  BarChart,
  LineChart,
  DonutChart,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@fabrk/components'
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Package,
  Settings,
  TrendingUp,
  Activity,
  BarChart3,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
  Globe,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

// --- Mock Data ---

const revenueData = [
  { month: 'Aug', revenue: 8200 },
  { month: 'Sep', revenue: 9100 },
  { month: 'Oct', revenue: 9800 },
  { month: 'Nov', revenue: 10500 },
  { month: 'Dec', revenue: 11200 },
  { month: 'Jan', revenue: 12450 },
]

const dauData = [
  { day: 'Mon', users: 2410 },
  { day: 'Tue', users: 2580 },
  { day: 'Wed', users: 2720 },
  { day: 'Thu', users: 2650 },
  { day: 'Fri', users: 2890 },
  { day: 'Sat', users: 2340 },
  { day: 'Sun', users: 2847 },
]

const planDistribution = [
  { label: 'Free', value: 60, color: 'var(--color-chart-1)' },
  { label: 'Pro', value: 30, color: 'var(--color-chart-2)' },
  { label: 'Team', value: 10, color: 'var(--color-chart-3)' },
]

const topCustomers = [
  { name: 'Acme Corp', plan: 'Team', mrr: '$2,400', status: 'active', date: 'Jan 15, 2026' },
  { name: 'Globex Inc', plan: 'Pro', mrr: '$1,200', status: 'active', date: 'Jan 12, 2026' },
  { name: 'Initech', plan: 'Pro', mrr: '$840', status: 'active', date: 'Jan 10, 2026' },
  { name: 'Hooli', plan: 'Team', mrr: '$720', status: 'churned', date: 'Dec 28, 2025' },
  { name: 'Pied Piper', plan: 'Pro', mrr: '$480', status: 'active', date: 'Dec 20, 2025' },
  { name: 'Soylent', plan: 'Free', mrr: '$0', status: 'trial', date: 'Dec 18, 2025' },
]

interface NavItemData {
  id: string
  label: string
  icon: React.ReactNode
  active?: boolean
  badge?: string
}

const navSections: { title: string; items: NavItemData[] }[] = [
  {
    title: 'Main',
    items: [
      { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-[15px]" />, active: true },
      { id: 'revenue', label: 'Revenue', icon: <DollarSign className="size-[15px]" /> },
      { id: 'users', label: 'Users', icon: <Users className="size-[15px]" /> },
    ],
  },
  {
    title: 'Products',
    items: [
      { id: 'products', label: 'All Products', icon: <Package className="size-[15px]" />, badge: '3' },
      { id: 'features', label: 'Features', icon: <Zap className="size-[15px]" /> },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="size-[15px]" /> },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'integrations', label: 'Integrations', icon: <Globe className="size-[15px]" /> },
      { id: 'settings', label: 'Settings', icon: <Settings className="size-[15px]" /> },
    ],
  },
]

function NavItem({ item }: { item: NavItemData }) {
  return (
    <button
      className={`flex w-full items-center gap-2 ${mode.radius} px-2 py-[6px] text-left text-[13px] transition-colors ${
        item.active
          ? 'bg-foreground text-background font-medium'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <span className="shrink-0 opacity-70">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={`flex h-[18px] min-w-[18px] items-center justify-center ${mode.radius} px-1 text-[10px] font-medium ${
            item.active ? 'bg-background/20 text-background' : 'bg-secondary text-muted-foreground'
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
}

export default function AnalyticsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <div className={cn('flex size-7 items-center justify-center bg-foreground text-background text-xs font-bold', mode.radius)}>
              F
            </div>
            <span className="text-[13px] font-semibold">FABRK</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-2.5 pb-1">
          <div className={cn('flex items-center gap-1.5 border border-border bg-background px-2.5 py-[5px] text-muted-foreground', mode.radius)}>
            <Search className="size-3" />
            <span className="text-[12px]">Search</span>
            <kbd className={cn('ml-auto border border-border bg-card px-1 py-[1px] text-[10px]', mode.radius)}>/</kbd>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="mb-[2px] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                {section.title}
              </div>
              <div className="space-y-[1px]">
                {section.items.map((item) => (
                  <NavItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border px-2.5 py-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
              J
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate leading-tight">Jason</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Pro Plan</div>
            </div>
            <button className="text-muted-foreground hover:text-foreground" aria-label="Sign out">
              <LogOut className="size-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2 lg:px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground" aria-label="Open menu">
              <Menu className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer transition-colors">Home</span>
              <ChevronRight className="size-3" />
              <span className="font-medium text-foreground">Analytics</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
              <Bell className="size-[15px]" />
              <span className="absolute -top-0.5 -right-0.5 flex size-1.5 rounded-full bg-destructive" />
            </button>
            <button className={cn('border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors', mode.radius)}>
              Account Settings
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 p-3 lg:p-4">

            {/* Page Title */}
            <div className="px-0.5">
              <h1 className="text-[15px] font-semibold tracking-tight">Analytics Overview</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Real-time SaaS metrics and KPIs</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                title="MRR"
                value="$12,450"
                change={8.3}
                trend="up"
                subtitle="vs last month"
                icon={<DollarSign className="size-3.5 text-muted-foreground" />}
              />
              <KpiCard
                title="ACTIVE USERS"
                value="2,847"
                change={12.4}
                trend="up"
                subtitle="daily active"
                icon={<Users className="size-3.5 text-muted-foreground" />}
              />
              <KpiCard
                title="CHURN RATE"
                value="3.2%"
                change={0.5}
                trend="down"
                subtitle="vs last month"
                icon={<TrendingUp className="size-3.5 text-muted-foreground" />}
              />
              <KpiCard
                title="ARPU"
                value="$48.20"
                change={2.1}
                trend="up"
                subtitle="per user"
                icon={<Activity className="size-3.5 text-muted-foreground" />}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card size="auto">
                <CardHeader
                  title="MONTHLY REVENUE"
                  icon={<BarChart3 className="size-3.5 text-muted-foreground" />}
                  meta="6M"
                />
                <CardContent padding="md">
                  <BarChart
                    data={revenueData}
                    xAxisKey="month"
                    series={[{ dataKey: 'revenue', name: 'Revenue', radius: [3, 3, 0, 0] }]}
                    height={240}
                    yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    tooltipFormatter={(v) => `$${v.toLocaleString()}`}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  />
                </CardContent>
              </Card>

              <Card size="auto">
                <CardHeader
                  title="DAILY ACTIVE USERS"
                  icon={<Users className="size-3.5 text-muted-foreground" />}
                  meta="7D"
                />
                <CardContent padding="md">
                  <LineChart
                    data={dauData}
                    xAxisKey="day"
                    series={[{ dataKey: 'users', name: 'Active Users', type: 'monotone' }]}
                    height={240}
                    yAxisFormatter={(v) => v.toLocaleString()}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Table + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card size="auto" className="lg:col-span-2">
                <CardHeader title="TOP ACCOUNTS" meta={`${topCustomers.length} accounts`} />
                <CardContent padding="sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NAME</TableHead>
                        <TableHead>PLAN</TableHead>
                        <TableHead>MRR</TableHead>
                        <TableHead>DATE</TableHead>
                        <TableHead>STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{c.plan.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{c.mrr}</TableCell>
                          <TableCell className="text-muted-foreground">{c.date}</TableCell>
                          <TableCell>
                            <Badge
                              variant={c.status === 'active' ? 'default' : c.status === 'churned' ? 'destructive' : 'outline'}
                            >
                              {c.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card size="auto">
                <CardHeader title="PLAN DISTRIBUTION" meta="3 tiers" />
                <CardContent padding="md">
                  <div className="flex items-center justify-center py-2">
                    <DonutChart
                      data={planDistribution}
                      size={180}
                      thickness={40}
                      showLegend
                      showPercentages
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
