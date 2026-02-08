'use client'

import {
  Card,
  Badge,
  Button,
  Separator,
  BarChart,
  LineChart,
  DonutChart,
  Sparkline,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

const KPI_DATA = [
  { label: 'REVENUE', value: '$12,450', change: '+12%', positive: true },
  { label: 'USERS', value: '1,284', change: '+8%', positive: true },
  { label: 'CONVERSION', value: '3.2%', change: '-0.4%', positive: false },
  { label: 'UPTIME', value: '99.9%', change: '+0.1%', positive: true },
]

const REVENUE_DATA = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5100, expenses: 3200 },
  { month: 'Mar', revenue: 4800, expenses: 2900 },
  { month: 'Apr', revenue: 6200, expenses: 3400 },
  { month: 'May', revenue: 7100, expenses: 3800 },
  { month: 'Jun', revenue: 6800, expenses: 3600 },
]

const TRAFFIC_DATA = [
  { day: 'Mon', visits: 420 },
  { day: 'Tue', visits: 380 },
  { day: 'Wed', visits: 510 },
  { day: 'Thu', visits: 470 },
  { day: 'Fri', visits: 390 },
  { day: 'Sat', visits: 280 },
  { day: 'Sun', visits: 320 },
]

const CATEGORY_DATA = [
  { name: 'Organic', value: 45 },
  { name: 'Direct', value: 25 },
  { name: 'Referral', value: 18 },
  { name: 'Social', value: 12 },
]

const SPARKLINE_DATA = [3, 5, 4, 7, 6, 8, 9, 7, 10, 8, 11, 12]

const NAV_ITEMS = [
  { label: 'OVERVIEW', active: true },
  { label: 'ANALYTICS' },
  { label: 'USERS' },
  { label: 'SETTINGS' },
]

export default function Home() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={cn('w-52 border-r p-4 flex flex-col gap-1 hidden md:flex', mode.color.border.default)}>
        <div className="mb-6">
          <h1 className="text-sm font-bold uppercase tracking-wider text-primary">DASHBOARD</h1>
          <Badge className="text-xs mt-1">[FABRK]</Badge>
        </div>

        {NAV_ITEMS.map((item) => (
          <Button
            key={item.label}
            variant={item.active ? 'secondary' : 'ghost'}
            className="justify-start text-xs h-8"
          >
            &gt; {item.label}
          </Button>
        ))}

        <div className="mt-auto">
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">v0.1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_DATA.map((kpi) => (
            <Card key={kpi.label} className={cn('p-4 border border-border', mode.radius)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase">{kpi.label}</p>
                <span className={cn(
                  'text-xs font-bold',
                  kpi.positive ? 'text-primary' : 'text-destructive'
                )}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <div className="mt-2">
                <Sparkline
                  data={SPARKLINE_DATA}
                  width={120}
                  height={24}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={cn('p-4 border border-border col-span-2', mode.radius)}>
            <h3 className="text-sm font-bold uppercase mb-4">[REVENUE VS EXPENSES]</h3>
            <BarChart
              data={REVENUE_DATA}
              index="month"
              categories={['revenue', 'expenses']}
              className="h-64"
            />
          </Card>

          <Card className={cn('p-4 border border-border', mode.radius)}>
            <h3 className="text-sm font-bold uppercase mb-4">[TRAFFIC SOURCE]</h3>
            <DonutChart
              data={CATEGORY_DATA}
              category="value"
              index="name"
              className="h-64"
            />
          </Card>
        </div>

        {/* Line Chart */}
        <Card className={cn('p-4 border border-border', mode.radius)}>
          <h3 className="text-sm font-bold uppercase mb-4">[WEEKLY VISITS]</h3>
          <LineChart
            data={TRAFFIC_DATA}
            index="day"
            categories={['visits']}
            className="h-48"
          />
        </Card>

        {/* Recent Activity Table */}
        <Card className={cn('p-4 border border-border', mode.radius)}>
          <h3 className="text-sm font-bold uppercase mb-4">[RECENT EVENTS]</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground w-20">TIME</span>
              <span className="text-muted-foreground flex-1">EVENT</span>
              <span className="text-muted-foreground w-20 text-right">STATUS</span>
            </div>
            {[
              { time: '14:32', event: 'User signup — jason@example.com', status: 'OK' },
              { time: '14:28', event: 'Payment processed — $49.00', status: 'OK' },
              { time: '14:15', event: 'API rate limit warning', status: 'WARN' },
              { time: '14:02', event: 'Deployment completed — v2.1.0', status: 'OK' },
              { time: '13:45', event: 'Database backup completed', status: 'OK' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="text-muted-foreground w-20">{row.time}</span>
                <span className="flex-1">{row.event}</span>
                <span className={cn(
                  'w-20 text-right font-bold',
                  row.status === 'OK' ? 'text-primary' : 'text-destructive'
                )}>
                  [{row.status}]
                </span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}
