'use client'

import Link from 'next/link'
import {
  Button,
  Badge,
  PricingCard,
  Card,
  CardContent,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
import {
  GitBranch,
  ShieldCheck,
  Zap,
  BarChart2,
  CheckCircle2,
  Github,
  ArrowRight,
  Star,
  Users,
  Code2,
} from 'lucide-react'

const features = [
  {
    icon: <ShieldCheck className="size-5" />,
    title: 'Security Scanning',
    description:
      'Automatically detect CVEs, secrets, and OWASP vulnerabilities across every PR before they reach production.',
  },
  {
    icon: <BarChart2 className="size-5" />,
    title: 'Code Quality Metrics',
    description:
      'Track complexity, duplication, and test coverage trends over time with per-file drill-down analysis.',
  },
  {
    icon: <Zap className="size-5" />,
    title: 'PR Velocity Analytics',
    description:
      'Measure cycle time, review turnaround, and merge rates so you can find and fix bottlenecks fast.',
  },
  {
    icon: <GitBranch className="size-5" />,
    title: 'Branch Comparison',
    description:
      'Side-by-side quality diffs between branches so code reviews are data-driven, not guesswork.',
  },
]

const testimonials = [
  {
    quote: 'We caught a leaked API key in a PR before it was ever merged. That alone paid for the year.',
    author: 'Sarah K.',
    role: 'Head of Engineering, Nimbus',
    avatar: 'S',
  },
  {
    quote: 'Our PR cycle time dropped from 4.2 days to 1.8 days after we started tracking bottlenecks in CodeScan.',
    author: 'Marcus T.',
    role: 'Staff Engineer, Celerity',
    avatar: 'M',
  },
  {
    quote: 'The complexity trending saved us from a complete rewrite. We caught the drift early enough to fix it incrementally.',
    author: 'Priya N.',
    role: 'Engineering Manager, Optic',
    avatar: 'P',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className={cn("flex size-7 items-center justify-center bg-accent text-accent-foreground text-xs font-bold", mode.radius)}>
              CS
            </div>
            <span className="text-sm font-bold tracking-tight">CodeScan</span>
            <Badge variant="secondary" className="ml-1">BETA</Badge>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Customers
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">LOG IN</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                &gt; GET STARTED FREE
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Now scanning 14,000+ GitHub repositories daily
          </span>
        </div>
        <h1 className={cn('mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl', mode.font)}>
          CODE QUALITY ANALYTICS
          <br />
          <span className="text-accent">FOR GITHUB TEAMS</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Automated security scanning, complexity trending, and PR velocity metrics — all in one
          dashboard. Connect your repos in 60 seconds and get actionable insights immediately.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              <Github className="size-4" />
              &gt; CONNECT GITHUB FREE
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard">
              VIEW DEMO DASHBOARD
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free plan includes 3 repos. No credit card required.
        </p>

        {/* Social proof strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="size-4" />
            <span>2,400+ engineering teams</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Code2 className="size-4" />
            <span>14M+ files scanned</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Star className="size-4" />
            <span>4.9 / 5 on G2</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">FEATURES</Badge>
            <h2 className={cn('text-2xl font-bold uppercase tracking-wide', mode.font)}>
              EVERYTHING YOUR TEAM NEEDS
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              One integration. All the insight.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} size="auto" className={cn('border', mode.radius)}>
                <CardContent padding="md">
                  <div className={cn("mb-3 flex size-9 items-center justify-center bg-accent/10 text-accent", mode.radius)}>
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">CUSTOMERS</Badge>
            <h2 className={cn('text-2xl font-bold uppercase tracking-wide', mode.font)}>
              WHAT TEAMS ARE SAYING
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.author} size="auto" className={cn('border', mode.radius)}>
                <CardContent padding="md">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-medium">{t.author}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">PRICING</Badge>
            <h2 className={cn('text-2xl font-bold uppercase tracking-wide', mode.font)}>
              SIMPLE, TRANSPARENT PRICING
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              All plans include unlimited scans on connected repos.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center">
            {/* Hobby */}
            <div className={cn('w-full max-w-sm border bg-background p-6', mode.radius)}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                HOBBY
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Perfect for solo developers and side projects.
              </p>
              <ul className="mt-6 space-y-2">
                {['3 repositories', '7-day history', 'Security scanning', 'Email alerts'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-8 w-full" size="sm" asChild>
                <Link href="/dashboard">GET STARTED FREE</Link>
              </Button>
            </div>

            {/* Pro — featured with PricingCard */}
            <PricingCard
              price="$29"
              title="PRO PLAN"
              priceSubtext="PER MONTH, BILLED MONTHLY"
              regularPrice="$49"
              discountMessage="SAVE $20/MO — LIMITED TIME"
              urgencyMessage="BETA PRICING ENDS SOON"
              highlights={[
                'UNLIMITED REPOS',
                'FULL HISTORY',
                'TEAM SEATS INCLUDED',
                'PRIORITY SUPPORT',
              ]}
              trustLine="Cancel anytime. 14-day money-back guarantee."
              headerCode="PRO"
            >
              <Button className="w-full" asChild>
                <Link href="/dashboard">&gt; START PRO TRIAL</Link>
              </Button>
            </PricingCard>

            {/* Team */}
            <div className={cn('w-full max-w-sm border bg-background p-6', mode.radius)}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TEAM
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                For engineering teams shipping at scale.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  'Everything in Pro',
                  'Up to 25 team members',
                  'SSO / SAML',
                  'JIRA & Slack integration',
                  'SLA + dedicated support',
                  'Custom retention policy',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-8 w-full" size="sm" asChild>
                <Link href="/dashboard">CONTACT SALES</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className={cn('text-2xl font-bold uppercase tracking-wide', mode.font)}>
            READY TO SHIP BETTER CODE?
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Connect your first repo in 60 seconds. No config files, no CI changes required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                <Github className="size-4" />
                &gt; CONNECT GITHUB FREE
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-accent text-accent-foreground text-[9px] font-bold">
              CS
            </div>
            <span>CodeScan — AI-generated with FABRK Framework</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
