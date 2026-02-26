'use client'

import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import {
  DashboardShell,
  DashboardHeader,
  StatsGrid,
  KpiCard,
  BarChart,
  LineChart,
  DataTable,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Button,
} from '@fabrk/components'
import {
  GitBranch,
  ShieldAlert,
  GitPullRequest,
  Code2,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react'

// --- Mock Data ---

const weeklyScans = [
  { day: 'Mon', scans: 312 },
  { day: 'Tue', scans: 398 },
  { day: 'Wed', scans: 421 },
  { day: 'Thu', scans: 387 },
  { day: 'Fri', scans: 456 },
  { day: 'Sat', scans: 203 },
  { day: 'Sun', scans: 174 },
]

const complexityTrend = [
  { week: 'W1', complexity: 68, coverage: 71 },
  { week: 'W2', complexity: 71, coverage: 74 },
  { week: 'W3', complexity: 69, coverage: 76 },
  { week: 'W4', complexity: 74, coverage: 73 },
  { week: 'W5', complexity: 72, coverage: 78 },
  { week: 'W6', complexity: 70, coverage: 82 },
  { week: 'W7', complexity: 67, coverage: 85 },
  { week: 'W8', complexity: 64, coverage: 87 },
]

const issuesByType = [
  { type: 'Security', critical: 3, high: 12, medium: 28 },
  { type: 'Quality', critical: 0, high: 7, medium: 41 },
  { type: 'Coverage', critical: 1, high: 4, medium: 19 },
  { type: 'Duplication', critical: 0, high: 2, medium: 15 },
]

interface RepoRow {
  name: string
  language: string
  issues: number
  coverage: string
  complexity: string
  lastScan: string
  status: 'passing' | 'warning' | 'failing'
}

const repos: RepoRow[] = [
  { name: 'api-gateway', language: 'TypeScript', issues: 4, coverage: '91%', complexity: 'A', lastScan: '3 min ago', status: 'passing' },
  { name: 'auth-service', language: 'TypeScript', issues: 2, coverage: '88%', complexity: 'A', lastScan: '7 min ago', status: 'passing' },
  { name: 'payment-processor', language: 'Go', issues: 15, coverage: '74%', complexity: 'B', lastScan: '12 min ago', status: 'warning' },
  { name: 'data-pipeline', language: 'Python', issues: 31, coverage: '52%', complexity: 'C', lastScan: '18 min ago', status: 'failing' },
  { name: 'web-frontend', language: 'TypeScript', issues: 7, coverage: '83%', complexity: 'B', lastScan: '22 min ago', status: 'warning' },
  { name: 'infra-scripts', language: 'Shell', issues: 0, coverage: 'N/A', complexity: 'A', lastScan: '31 min ago', status: 'passing' },
  { name: 'ml-inference', language: 'Python', issues: 9, coverage: '61%', complexity: 'B', lastScan: '45 min ago', status: 'warning' },
  { name: 'notification-svc', language: 'TypeScript', issues: 1, coverage: '94%', complexity: 'A', lastScan: '1 hr ago', status: 'passing' },
]

const columns: ColumnDef<RepoRow>[] = [
  {
    accessorKey: 'name',
    header: 'REPOSITORY',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <GitBranch className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'language',
    header: 'LANGUAGE',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.language}</span>
    ),
  },
  {
    accessorKey: 'issues',
    header: 'ISSUES',
    cell: ({ row }) => (
      <span className={row.original.issues > 10 ? 'text-destructive font-semibold' : ''}>
        {row.original.issues}
      </span>
    ),
  },
  { accessorKey: 'coverage', header: 'COVERAGE', cell: ({ row }) => row.original.coverage },
  {
    accessorKey: 'complexity',
    header: 'GRADE',
    cell: ({ row }) => {
      const grade = row.original.complexity
      return (
        <Badge variant={grade === 'A' ? 'default' : grade === 'B' ? 'secondary' : 'destructive'}>
          {grade}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'lastScan',
    header: 'LAST SCAN',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.lastScan}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'STATUS',
    cell: ({ row }) => {
      const s = row.original.status
      return (
        <Badge variant={s === 'passing' ? 'default' : s === 'warning' ? 'outline' : 'destructive'}>
          {s.toUpperCase()}
        </Badge>
      )
    },
  },
]

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" />, href: '/demo', active: true },
  { id: 'repos', label: 'Repositories', icon: <GitBranch className="size-4" />, href: '/demo', badge: 8 },
  { id: 'security', label: 'Security', icon: <ShieldAlert className="size-4" />, href: '/demo', badge: 3 },
  { id: 'prs', label: 'Pull Requests', icon: <GitPullRequest className="size-4" />, href: '/demo' },
  { id: 'trends', label: 'Trends', icon: <TrendingUp className="size-4" />, href: '/demo' },
  { id: 'settings', label: 'Settings', icon: <Settings className="size-4" />, href: '/demo' },
]

export default function DemoPage() {
  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      title="CodeScan"
      logo={
        <div className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-[10px] font-bold">
          CS
        </div>
      }
      user={{ name: 'Alex Rivera', tier: 'pro' }}
      onSignOut={() => {}}
      linkComponent={Link}
    >
      {/* Header */}
      <DashboardHeader
        title="OVERVIEW"
        subtitle="Last scan: 3 minutes ago — all repos healthy"
        actions={
          <Button size="sm">
            <Plus className="size-3.5" />
            {'>'} ADD REPO
          </Button>
        }
      />

      {/* Stats strip */}
      <StatsGrid
        items={[
          { label: 'Repos Connected', value: 8, icon: <GitBranch className="size-4" />, change: '+2 this week' },
          { label: 'Issues Found', value: 69, icon: <AlertTriangle className="size-4" /> },
          { label: 'Critical', value: 4, icon: <ShieldAlert className="size-4" /> },
          { label: 'Avg Coverage', value: '78%', icon: <Code2 className="size-4" />, change: '+6% this month' },
        ]}
        columns={4}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        <KpiCard
          title="PR CYCLE TIME"
          value="1.8d"
          change={14}
          trend="down"
          subtitle="vs last month"
          icon={<Clock className="size-3.5 text-muted-foreground" />}
        />
        <KpiCard
          title="SCANS TODAY"
          value="2,341"
          change={8.2}
          trend="up"
          subtitle="vs yesterday"
          icon={<Code2 className="size-3.5 text-muted-foreground" />}
        />
        <KpiCard
          title="PASSING REPOS"
          value="5 / 8"
          change={0}
          trend="neutral"
          subtitle="3 need attention"
          icon={<CheckCircle2 className="size-3.5 text-muted-foreground" />}
        />
        <KpiCard
          title="SECRETS CAUGHT"
          value="12"
          change={3}
          trend="up"
          subtitle="this month"
          icon={<ShieldAlert className="size-3.5 text-muted-foreground" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-3 px-4 lg:grid-cols-2">
        <Card size="auto">
          <CardHeader
            title="COMPLEXITY VS COVERAGE — 8 WEEKS"
            icon={<TrendingUp className="size-3.5 text-muted-foreground" />}
            meta="8W"
          />
          <CardContent padding="md">
            <LineChart
              data={complexityTrend}
              xAxisKey="week"
              series={[
                { dataKey: 'complexity', name: 'Avg Complexity', type: 'monotone' },
                { dataKey: 'coverage', name: 'Test Coverage %', type: 'monotone' },
              ]}
              height={220}
              showLegend
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            />
          </CardContent>
        </Card>

        <Card size="auto">
          <CardHeader
            title="SCANS PER DAY — THIS WEEK"
            icon={<Code2 className="size-3.5 text-muted-foreground" />}
            meta="7D"
          />
          <CardContent padding="md">
            <BarChart
              data={weeklyScans}
              xAxisKey="day"
              series={[{ dataKey: 'scans', name: 'Scans', radius: [3, 3, 0, 0] }]}
              height={220}
              yAxisFormatter={(v) => v.toLocaleString()}
              tooltipFormatter={(v) => v.toLocaleString()}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Issues by Type */}
      <div className="px-4 py-3">
        <Card size="auto">
          <CardHeader
            title="ISSUES BY TYPE — CURRENT"
            icon={<AlertTriangle className="size-3.5 text-muted-foreground" />}
            meta="LIVE"
          />
          <CardContent padding="md">
            <BarChart
              data={issuesByType}
              xAxisKey="type"
              series={[
                { dataKey: 'critical', name: 'Critical', stackId: 'stack', radius: 0 },
                { dataKey: 'high', name: 'High', stackId: 'stack', radius: 0 },
                { dataKey: 'medium', name: 'Medium', stackId: 'stack', radius: [3, 3, 0, 0] },
              ]}
              height={180}
              showLegend
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Repo Table */}
      <div className="px-4 pb-6">
        <Card size="auto">
          <CardHeader
            title="ALL REPOSITORIES"
            meta={`${repos.length} repos`}
            icon={<GitBranch className="size-3.5 text-muted-foreground" />}
          />
          <CardContent padding="sm">
            <DataTable
              columns={columns}
              data={repos}
              searchKey="name"
              searchPlaceholder="Search repositories..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-4 pb-4">
        <div className="text-center text-xs text-muted-foreground">
          This entire dashboard was built with{' '}
          <Link href="/" className="text-primary hover:underline">
            FABRK Framework
          </Link>
          {' '}components — DashboardShell, KpiCard, BarChart, LineChart, DataTable, StatsGrid, Badge, and Card.
        </div>
      </div>
    </DashboardShell>
  )
}
