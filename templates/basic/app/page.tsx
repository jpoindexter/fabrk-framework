import {
  Badge,
  Button,
  Card,
  Separator,
  StatsGrid,
  KpiCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Switch,
  Progress,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
import { useState } from 'react'

function HeroSection() {
  return (
    <section className="py-20 px-6 text-center space-y-6">
      <Badge className="text-xs tracking-widest">[SYSTEM ONLINE]</Badge>
      <h1 className={cn('text-4xl md:text-6xl font-bold tracking-tight', mode.font)}>
        YOUR APP NAME
      </h1>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
        Built with FABRK Framework. 109+ components, 18 themes, zero config.
        Edit this page to make it yours.
      </p>
      <div className="flex gap-3 justify-center pt-4">
        <Button size="lg">&gt; GET STARTED</Button>
        <Button size="lg" variant="outline">&gt; VIEW DOCS</Button>
      </div>
    </section>
  )
}

function StatsSection() {
  return (
    <section className="px-6 max-w-5xl mx-auto">
      <StatsGrid
        items={[
          { label: 'COMPONENTS', value: '109+' },
          { label: 'THEMES', value: '18' },
          { label: 'PACKAGES', value: '13' },
          { label: 'TESTS', value: '3,221' },
        ]}
      />
    </section>
  )
}

function MetricsSection() {
  return (
    <section className="px-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="BUILD TIME" value="1.7s" trend="down" change={-23} />
        <KpiCard title="BUNDLE SIZE" value="48kb" trend="neutral" />
        <KpiCard title="TYPE COVERAGE" value="100%" trend="up" change={2.1} />
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      title: 'AI-FIRST',
      description: 'Every package includes AGENTS.md. AI assistants discover components, props, and patterns automatically.',
    },
    {
      title: 'OWN RUNTIME',
      description: 'Vite 7 plugin with file-system routing, SSR streaming, middleware. Deploys anywhere.',
    },
    {
      title: 'BATTERIES INCLUDED',
      description: 'Auth, payments, email, storage, security, AI cost tracking. All adapter-based, all swappable.',
    },
    {
      title: 'TERMINAL AESTHETIC',
      description: '18 themes with runtime CSS switching. Monospace, uppercase, sharp. No hardcoded colors.',
    },
    {
      title: 'MODULAR',
      description: '13 packages. Install only what you need. Each focused, each tested, each documented.',
    },
    {
      title: 'PRODUCTION TESTED',
      description: 'Extracted from years of shipping real SaaS products. 12 rounds of security audits.',
    },
  ]

  return (
    <section className="px-6 max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="outline">[FEATURES]</Badge>
        <h2 className={cn('text-2xl font-bold', mode.font)}>WHAT YOU GET</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} className={cn('p-6 border border-border hover:border-primary/50 transition-colors', mode.radius)}>
            <h3 className={cn('text-sm font-bold text-primary mb-2', mode.font)}>{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function CodeSection() {
  return (
    <section className="px-6 max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="outline">[CODE]</Badge>
        <h2 className={cn('text-2xl font-bold', mode.font)}>THIS IS ALL IT TAKES</h2>
      </div>
      <Card className={cn('p-6 border border-border', mode.radius, mode.font)}>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{'// Build a full dashboard in 10 lines'}</p>
          <p><span className="text-primary">import</span> {'{'} DashboardShell, KpiCard, DataTable {'}'}</p>
          <p className="pl-4"><span className="text-primary">from</span> <span className="text-accent">{`'@fabrk/components'`}</span></p>
          <p className="mt-2"><span className="text-primary">export default function</span> Dashboard() {'{'}</p>
          <p className="pl-4"><span className="text-primary">return</span> {'('}</p>
          <p className="pl-8">{'<'}<span className="text-primary">DashboardShell</span> sidebarItems={'{items}'} user={'{user}'}{'>'}</p>
          <p className="pl-12">{'<'}<span className="text-primary">KpiCard</span> title=<span className="text-accent">{`"REVENUE"`}</span> value=<span className="text-accent">{`"$12k"`}</span> trend=<span className="text-accent">{`"up"`}</span> {'/>'}</p>
          <p className="pl-12">{'<'}<span className="text-primary">DataTable</span> columns={'{cols}'} data={'{rows}'} {'/>'}</p>
          <p className="pl-8">{'</'}<span className="text-primary">DashboardShell</span>{'>'}</p>
          <p className="pl-4">{')'}</p>
          <p>{'}'}</p>
        </div>
      </Card>
    </section>
  )
}

function ComponentShowcase() {
  const [progress, setProgress] = useState(67)
  const [switchOn, setSwitchOn] = useState(true)

  return (
    <section className="px-6 max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="outline">[LIVE]</Badge>
        <h2 className={cn('text-2xl font-bold', mode.font)}>COMPONENT PREVIEW</h2>
        <p className="text-muted-foreground text-sm">Interactive components. All theme-aware. All accessible.</p>
      </div>

      <Card className={cn('p-6 border border-border', mode.radius)}>
        <Tabs defaultValue="buttons">
          <TabsList>
            <TabsTrigger value="buttons">&gt; BUTTONS</TabsTrigger>
            <TabsTrigger value="inputs">&gt; INPUTS</TabsTrigger>
            <TabsTrigger value="feedback">&gt; FEEDBACK</TabsTrigger>
          </TabsList>

          <TabsContent value="buttons" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-3">
              <Button>&gt; PRIMARY</Button>
              <Button variant="secondary">&gt; SECONDARY</Button>
              <Button variant="outline">&gt; OUTLINE</Button>
              <Button variant="destructive">&gt; DESTRUCTIVE</Button>
              <Button variant="ghost">&gt; GHOST</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">&gt; SMALL</Button>
              <Button size="default">&gt; DEFAULT</Button>
              <Button size="lg">&gt; LARGE</Button>
            </div>
          </TabsContent>

          <TabsContent value="inputs" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <Input placeholder="Enter command..." />
              <Input placeholder="Disabled" disabled />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              <span className="text-sm text-muted-foreground">
                {switchOn ? '[ENABLED]' : '[DISABLED]'}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4 pt-4">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PROGRESS</span>
                <span className={cn('text-sm text-primary', mode.font)}>{progress}%</span>
              </div>
              <Progress value={progress} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>[INFO]</Badge>
              <Badge variant="secondary">[STATUS]</Badge>
              <Badge variant="outline">[v0.3.0]</Badge>
              <Badge variant="destructive">[ERROR]</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="px-6 max-w-3xl mx-auto text-center space-y-6 py-12">
      <h2 className={cn('text-2xl font-bold', mode.font)}>START BUILDING</h2>
      <Card className={cn('p-8 border border-primary/30 bg-card', mode.radius, mode.font)}>
        <div className="space-y-1 text-sm">
          <p className="text-primary">npx create-fabrk-app my-app</p>
          <p className="text-primary">cd my-app &amp;&amp; pnpm dev</p>
        </div>
      </Card>
      <div className="flex gap-3 justify-center">
        <Button>&gt; GITHUB</Button>
        <Button variant="outline">&gt; NPM</Button>
        <Button variant="outline">&gt; DOCS</Button>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className={cn('text-primary font-bold text-lg', mode.font)}>&gt; FABRK</span>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <a href="https://framework.fabrk.dev" className="hover:text-primary transition-colors">DOCS</a>
          <a href="https://github.com/jpoindexter/fabrk-framework" className="hover:text-primary transition-colors">GITHUB</a>
          <a href="https://www.npmjs.com/org/fabrk" className="hover:text-primary transition-colors">NPM</a>
        </div>
      </nav>

      <div className="space-y-16 pb-16">
        <HeroSection />
        <StatsSection />
        <MetricsSection />
        <Separator className="max-w-5xl mx-auto" />
        <FeaturesSection />
        <Separator className="max-w-5xl mx-auto" />
        <CodeSection />
        <Separator className="max-w-5xl mx-auto" />
        <ComponentShowcase />
        <Separator className="max-w-5xl mx-auto" />
        <CtaSection />
      </div>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        <p>Built with FABRK Framework — edit app/page.tsx to make it yours</p>
        <p className="mt-1">
          <a href="https://fabrk.dev" className="hover:text-primary transition-colors">fabrk.dev</a>
          {' · '}
          <a href="https://framework.fabrk.dev" className="hover:text-primary transition-colors">docs</a>
          {' · '}
          <a href="https://github.com/jpoindexter/fabrk-framework" className="hover:text-primary transition-colors">github</a>
        </p>
      </footer>
    </main>
  )
}
