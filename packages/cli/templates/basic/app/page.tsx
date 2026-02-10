'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  Badge,
  Input,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Progress,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
import { ThemeSwitcher } from './theme-switcher'

const SAMPLE_STATS = [
  { label: 'COMPONENTS', value: '105+' },
  { label: 'THEMES', value: '18' },
  { label: 'PACKAGES', value: '16' },
  { label: 'ZERO CONFIG', value: 'YES' },
]

export default function Home() {
  const [progress, setProgress] = useState(67)
  const [switchOn, setSwitchOn] = useState(true)

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className="text-xs">[SYSTEM]</Badge>
          <ThemeSwitcher />
        </div>

        <h1 className={cn('text-3xl md:text-5xl font-bold tracking-tight', mode.font)}>
          FABRK FRAMEWORK
        </h1>
        <p className="text-muted-foreground max-w-xl">
          The first UI framework designed for AI coding agents. Import components,
          wire adapters, ship products.
        </p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SAMPLE_STATS.map((stat) => (
          <Card key={stat.label} className={cn('p-4 border border-border', mode.radius)}>
            <p className="text-xs text-muted-foreground uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Component Showcase */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold uppercase">[COMPONENTS]</h2>

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
                <span className="text-sm font-mono text-primary">{progress}%</span>
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
              <Badge variant="outline">[v0.1.0]</Badge>
              <Badge variant="destructive">[ERROR]</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* Quick Start */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase">[QUICK START]</h2>
        <Card className={cn('p-6 border border-border font-mono text-sm space-y-2', mode.radius)}>
          <p className="text-muted-foreground"># Add components</p>
          <p className="text-primary">fabrk add button card dialog</p>
          <p className="text-muted-foreground mt-3"># Add a feature module</p>
          <p className="text-primary">fabrk add auth</p>
          <p className="text-muted-foreground mt-3"># Generate scaffolds</p>
          <p className="text-primary">fabrk generate component my-widget</p>
        </Card>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-8">
        <p>Built with FABRK Framework &mdash; edit app/page.tsx to get started</p>
      </footer>
    </main>
  )
}
