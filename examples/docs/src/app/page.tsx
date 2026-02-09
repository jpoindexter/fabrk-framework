'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import Link from 'next/link'

const features = [
  {
    label: 'COMPONENTS',
    value: '70+',
    description: 'Pre-built UI components with terminal aesthetic',
  },
  {
    label: 'PACKAGES',
    value: '16',
    description: 'Modular packages for auth, payments, AI, and more',
  },
  {
    label: 'THEMES',
    value: '18',
    description: 'Design system themes with runtime switching',
  },
  {
    label: 'TESTS',
    value: '410',
    description: 'Comprehensive test coverage across all packages',
  },
]

const quickLinks = [
  { label: '> GET STARTED', href: '/getting-started', description: 'Create your first FABRK app in 5 minutes' },
  { label: '> PACKAGES', href: '/packages', description: 'Explore 16 modular packages' },
  { label: '> COMPONENTS', href: '/components', description: 'Browse 70+ UI components' },
  { label: '> GUIDES', href: '/guides', description: 'Build a dashboard, add auth, integrate payments' },
  { label: '> MIGRATION', href: '/migration', description: 'Migrate an existing Next.js app to FABRK' },
  { label: '> CLI REFERENCE', href: '/cli', description: 'create-fabrk-app and fabrk dev CLI' },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-8">
      {/* Hero */}
      <div className="mb-16">
        <div className="text-muted-foreground text-xs mb-2">[FRAMEWORK v0.1.0]</div>
        <h1 className={cn('text-4xl font-bold text-foreground uppercase leading-tight', mode.font)}>
          THE FIRST UI FRAMEWORK<br />
          DESIGNED FOR AI CODING AGENTS
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">
          Stop generating 500 lines of custom components from scratch.
          Import pre-built, theme-aware components and tools.
          Ship full-stack apps in minutes, not hours.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/getting-started"
            className={cn(
              'inline-block border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs font-bold uppercase transition-colors hover:bg-primary/90',
              mode.font, mode.radius
            )}
          >
            {'>'} GET STARTED
          </Link>
          <Link
            href="/packages"
            className={cn(
              'inline-block border border-border px-6 py-3 text-xs font-bold uppercase text-foreground transition-colors hover:bg-secondary',
              mode.font, mode.radius
            )}
          >
            {'>'} EXPLORE PACKAGES
          </Link>
        </div>
      </div>

      {/* Quick Install */}
      <div className={cn('border border-border bg-card p-6 mb-12', mode.radius)}>
        <div className={cn('text-xs text-muted-foreground mb-2 uppercase', mode.font)}>
          [QUICK INSTALL]
        </div>
        <pre className="text-sm">
          <code>
            <span className="text-muted-foreground">$</span>{' '}
            <span className="text-primary">npx create-fabrk-app</span> my-app
          </code>
        </pre>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {features.map((feature) => (
          <div
            key={feature.label}
            className={cn('border border-border bg-card p-4', mode.radius)}
          >
            <div className={cn('text-2xl font-bold text-primary', mode.font)}>
              {feature.value}
            </div>
            <div className={cn('text-xs text-foreground uppercase mt-1', mode.font)}>
              {feature.label}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {feature.description}
            </div>
          </div>
        ))}
      </div>

      {/* What AI Agents See */}
      <div className="mb-12">
        <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
          [WHAT AI AGENTS SEE]
        </h2>
        <div className={cn('border border-border bg-card p-6', mode.radius)}>
          <div className="text-xs text-muted-foreground mb-3">
            When a user says: &quot;Build me a dashboard&quot; &mdash; the AI generates:
          </div>
          <pre className="text-sm leading-relaxed">
            <code>{`import {
  KPICard, Card, BarChart, LineChart, DataTable, Badge
} from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="REVENUE" value="$12,340" trend={12.5} />
        <KPICard title="USERS" value="1,572" trend={8.3} />
      </div>
      <Card className={cn("p-6 border border-border", mode.radius)}>
        <BarChart data={revenueData} />
      </Card>
      <DataTable columns={columns} data={users} />
    </div>
  )
}`}</code>
          </pre>
          <div className="mt-4 text-xs text-primary">
            Result: Full dashboard with KPIs, charts, and data table. 2 minutes. Consistent design.
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-12">
        <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
          [DOCUMENTATION]
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-primary/5',
                mode.radius
              )}
            >
              <div className={cn('text-sm font-bold text-foreground', mode.font)}>
                {link.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {link.description}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Supported Agents */}
      <div className={cn('border border-border bg-card p-6', mode.radius)}>
        <div className={cn('text-xs text-muted-foreground mb-3 uppercase', mode.font)}>
          [DESIGNED FOR]
        </div>
        <div className="flex flex-wrap gap-3">
          {['Claude Code', 'Cursor', 'GitHub Copilot', 'v0.dev', 'Windsurf', 'Cline'].map((agent) => (
            <span
              key={agent}
              className={cn(
                'border border-border px-3 py-1.5 text-xs text-foreground',
                mode.radius
              )}
            >
              {agent}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
