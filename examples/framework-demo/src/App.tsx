import { ColumnDef } from '@tanstack/react-table'
import {
  DashboardShell,
  DashboardHeader,
  AreaChart,
  BarChart,
  DataTable,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Button,
} from '@fabrk/components'
import {
  LayoutGrid,
  Layers,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Timer,
  FileCode2,
  Code2,
  Gavel,
  Radar,
  Bug,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'

// --- Mock Data ---

const issuesTrend = [
  { date: 'Sep 25', issues: 142 },
  { date: 'Oct 02', issues: 128 },
  { date: 'Oct 09', issues: 135 },
  { date: 'Oct 16', issues: 98 },
  { date: 'Oct 23', issues: 72 },
  { date: 'Today', issues: 54 },
]

const weeklyCoverage = [
  { day: 'M', coverage: 60 },
  { day: 'T', coverage: 75 },
  { day: 'W', coverage: 65 },
  { day: 'T', coverage: 85 },
  { day: 'F', coverage: 70 },
  { day: 'S', coverage: 50 },
  { day: 'S', coverage: 92 },
]

interface ScanRow {
  project: string
  language: string
  issues: number
  status: 'passing' | 'warning' | 'failing'
}

const scans: ScanRow[] = [
  { project: 'api-gateway', language: 'Go', issues: 3, status: 'passing' },
  { project: 'auth-service', language: 'Rust', issues: 12, status: 'failing' },
  { project: 'dashboard-ui', language: 'TypeScript', issues: 45, status: 'warning' },
  { project: 'data-pipeline', language: 'Python', issues: 8, status: 'passing' },
  { project: 'ml-inference', language: 'Python', issues: 22, status: 'warning' },
]

const scanColumns: ColumnDef<ScanRow>[] = [
  {
    accessorKey: 'project',
    header: 'PROJECT',
    cell: ({ row }) => (
      <span className="font-bold text-foreground">{row.original.project}</span>
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
      <span className={row.original.issues > 10 ? 'text-destructive font-bold' : ''}>
        {row.original.issues}
      </span>
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
  { id: 'overview', label: 'Overview', icon: <LayoutGrid className="size-4" />, href: '/', active: true },
  { id: 'projects', label: 'Projects', icon: <Layers className="size-4" />, href: '/' },
  { id: 'issues', label: 'Issues', icon: <AlertTriangle className="size-4" />, href: '/' },
  { id: 'security', label: 'Security', icon: <ShieldAlert className="size-4" />, href: '/' },
]

// --- Severity Bar Component ---

function SeverityBar({ label, critical, high, medium, total }: {
  label: string
  critical: number
  high: number
  medium: number
  total: number
}) {
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`
  return (
    <div className="grid grid-cols-12 items-center">
      <span className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="col-span-9 h-1.5 bg-muted rounded-full flex overflow-hidden mx-4">
        <div className="bg-destructive" style={{ width: pct(critical) }} />
        <div className="bg-orange-400" style={{ width: pct(high) }} />
        <div className="bg-yellow-400" style={{ width: pct(medium) }} />
      </div>
      <span className="col-span-1 text-[10px] font-bold text-muted-foreground text-right">
        {Math.round(((critical + high + medium) / total) * 100)}%
      </span>
    </div>
  )
}

// --- Mini Stat Widget ---

function MiniStat({ label, value, delta, icon }: {
  label: string
  value: string
  delta?: string
  icon: React.ReactNode
}) {
  return (
    <Card size="auto">
      <CardContent padding="sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-foreground">{value}</span>
          {delta && (
            <span className="text-[9px] font-bold text-success bg-success/10 px-1 rounded">{delta}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Metric Card ---

function MetricCard({ label, value, delta, deltaDown, icon, iconBg }: {
  label: string
  value: string
  delta: string
  deltaDown?: boolean
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <Card size="auto">
      <CardContent padding="md">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded ${iconBg}`}>{icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className={`text-xs font-bold flex items-center ${deltaDown ? 'text-success' : 'text-destructive'}`}>
            {deltaDown ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
            {delta}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function App() {
  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      title="CodeScan"
      logo={
        <div className="flex size-7 items-center justify-center rounded bg-accent text-accent-foreground text-[10px] font-bold">
          {'</>'}
        </div>
      }
      user={{ name: 'John Doe', tier: 'enterprise' }}
      onSignOut={() => {}}
    >
      {/* Header */}
      <DashboardHeader
        title="OVERVIEW"
        subtitle="Updated 14:30 EST — Instance-04"
        actions={
          <Button size="sm">
            <RefreshCw className="size-3.5" />
            {'> RUN NEW SCAN'}
          </Button>
        }
      />

      {/* Main 12-col grid */}
      <div className="grid grid-cols-12 gap-3 px-4 pb-6 auto-rows-min">

        {/* Technical Debt — hero card, spans 2 rows */}
        <div className="col-span-12 lg:col-span-4 lg:row-span-2">
          <Card size="full">
            <CardContent padding="md">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">[TECH_DEBT]</span>
                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded">
                      <Timer className="size-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-foreground tracking-tighter">42d</span>
                    <span className="text-xs font-bold text-success flex items-center">
                      <ArrowDown className="size-3" />4.5%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">Calculated remediation effort</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Refactor Progress</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-muted h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-accent h-full rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues Over Time — area chart, spans 2 rows */}
        <div className="col-span-12 lg:col-span-8 lg:row-span-2">
          <Card size="full">
            <CardHeader
              title="[ISSUES_OVER_TIME]"
              meta={
                <div className="flex gap-2">
                  <Badge variant="outline">30D</Badge>
                  <Badge variant="default">LIVE</Badge>
                </div>
              }
            />
            <CardContent padding="md">
              <AreaChart
                data={issuesTrend}
                xAxisKey="date"
                series={[
                  { dataKey: 'issues', name: 'Issues', type: 'monotone', fillOpacity: 0.1, strokeWidth: 2 },
                ]}
                height={180}
                gradient
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              />
            </CardContent>
          </Card>
        </div>

        {/* 4 Mini Stats */}
        <div className="col-span-6 md:col-span-3">
          <MiniStat label="Files" value="1,240" delta="+12" icon={<FileCode2 className="size-4" />} />
        </div>
        <div className="col-span-6 md:col-span-3">
          <MiniStat label="LOC" value="458k" delta="+2.3k" icon={<Code2 className="size-4" />} />
        </div>
        <div className="col-span-6 md:col-span-3">
          <MiniStat label="Rules" value="342" icon={<Gavel className="size-4" />} />
        </div>
        <div className="col-span-6 md:col-span-3">
          <MiniStat label="Scans" value="12" delta="+4" icon={<Radar className="size-4" />} />
        </div>

        {/* 3 Metric Cards */}
        <div className="col-span-12 md:col-span-4">
          <MetricCard
            label="[CODE_SMELLS]"
            value="1,832"
            delta="6.1%"
            deltaDown
            icon={<Bug className="size-4" />}
            iconBg="bg-purple-100 text-purple-600"
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <MetricCard
            label="[ACTIVE_BUGS]"
            value="14"
            delta="16%"
            icon={<AlertTriangle className="size-4" />}
            iconBg="bg-red-100 text-red-600"
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <Card size="auto">
            <CardContent padding="md">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded bg-blue-100 text-blue-600">
                  <ShieldCheck className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">[VULNERABILITIES]</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">0</span>
                <Badge variant="default">HEALTHY</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issue Severity & Density */}
        <div className="col-span-12">
          <Card size="auto">
            <CardHeader
              title="[SEVERITY_DENSITY]"
              meta={
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Medium</span>
                  </div>
                </div>
              }
            />
            <CardContent padding="md">
              <div className="space-y-5">
                <SeverityBar label="Security" critical={15} high={20} medium={10} total={100} />
                <SeverityBar label="Quality" critical={5} high={15} medium={50} total={100} />
                <SeverityBar label="Coverage" critical={2} high={8} medium={30} total={100} />
                <SeverityBar label="Duplicate" critical={0} high={5} medium={20} total={100} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Coverage bar chart */}
        <div className="col-span-12 lg:col-span-5">
          <Card size="auto">
            <CardHeader title="[WEEKLY_COVERAGE]" meta="7D" />
            <CardContent padding="md">
              <BarChart
                data={weeklyCoverage}
                xAxisKey="day"
                series={[{ dataKey: 'coverage', name: 'Coverage %', radius: [3, 3, 0, 0] }]}
                height={160}
                yAxisFormatter={(v) => `${v}%`}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Scan Pipeline table */}
        <div className="col-span-12 lg:col-span-7">
          <Card size="auto">
            <CardHeader title="[SCAN_PIPELINE]" />
            <CardContent padding="sm">
              <DataTable
                columns={scanColumns}
                data={scans}
                searchKey="project"
                searchPlaceholder="Filter..."
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardShell>
  )
}
