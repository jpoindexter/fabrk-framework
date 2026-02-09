'use client'

import { cn } from '@fabrk/core'
import {
  DashboardShell,
  DashboardHeader,
  StatsGrid,
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
  { label: 'Free', value: 60, color: 'hsl(var(--chart-1))' },
  { label: 'Pro', value: 30, color: 'hsl(var(--chart-2))' },
  { label: 'Team', value: 10, color: 'hsl(var(--chart-3))' },
]

const topCustomers = [
  { name: 'Acme Corp', plan: 'Team', mrr: '$2,400', status: 'active' },
  { name: 'Globex Inc', plan: 'Pro', mrr: '$1,200', status: 'active' },
  { name: 'Initech', plan: 'Pro', mrr: '$840', status: 'active' },
  { name: 'Hooli', plan: 'Team', mrr: '$720', status: 'churned' },
  { name: 'Pied Piper', plan: 'Pro', mrr: '$480', status: 'active' },
  { name: 'Soylent', plan: 'Free', mrr: '$0', status: 'trial' },
]

const sidebarItems = [
  { id: 'overview', label: 'Overview', active: true },
  { id: 'revenue', label: 'Revenue' },
  { id: 'users', label: 'Users' },
  { id: 'products', label: 'Products' },
  { id: 'settings', label: 'Settings' },
]

// --- Page Component ---

export default function AnalyticsDashboard() {
  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      user={{ name: 'Jason', tier: 'pro' }}
      logo={<span className="text-accent text-xl">#</span>}
      title="Analytics"
      onSignOut={() => {}}
    >
      <DashboardHeader
        title="ANALYTICS OVERVIEW"
        subtitle="Real-time SaaS metrics and KPIs"
      />

      {/* KPI Stats */}
      <StatsGrid
        items={[
          { label: 'MRR', value: '$12,450', change: '+8.3%' },
          { label: 'Active Users', value: 2847, change: '+12.4%' },
          { label: 'Churn Rate', value: '3.2%', change: '-0.5%' },
          { label: 'ARPU', value: '$48.20', change: '+2.1%' },
        ]}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Monthly Revenue Bar Chart */}
        <div className="border-b border-r border-border p-4">
          <div className="mb-3">
            <span className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
              [REVENUE] MONTHLY RECURRING REVENUE
            </span>
          </div>
          <BarChart
            data={revenueData}
            xAxisKey="month"
            series={[{ dataKey: 'revenue', name: 'Revenue' }]}
            height={250}
            yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            tooltipFormatter={(v) => `$${v.toLocaleString()}`}
          />
        </div>

        {/* Daily Active Users Line Chart */}
        <div className="border-b border-border p-4">
          <div className="mb-3">
            <span className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
              [USERS] DAILY ACTIVE USERS
            </span>
          </div>
          <LineChart
            data={dauData}
            xAxisKey="day"
            series={[{ dataKey: 'users', name: 'Active Users', type: 'monotone' }]}
            height={250}
            yAxisFormatter={(v) => v.toLocaleString()}
          />
        </div>
      </div>

      {/* Bottom Row: Table + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Top Customers Table */}
        <div className="lg:col-span-2 border-r border-border p-4">
          <div className="mb-3">
            <span className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
              [CUSTOMERS] TOP ACCOUNTS
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAME</TableHead>
                <TableHead>PLAN</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.map((customer) => (
                <TableRow key={customer.name}>
                  <TableCell className={cn('font-medium', mode.font)}>
                    {customer.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{customer.plan.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className={cn('tabular-nums', mode.font)}>
                    {customer.mrr}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === 'active'
                          ? 'default'
                          : customer.status === 'churned'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {customer.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Plan Distribution Donut */}
        <div className="p-4">
          <div className="mb-3">
            <span className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
              [PLANS] DISTRIBUTION
            </span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart
              data={planDistribution}
              size={220}
              thickness={50}
              showLegend
              showPercentages
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
