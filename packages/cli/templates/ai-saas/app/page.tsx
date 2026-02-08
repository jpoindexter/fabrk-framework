'use client'

import { useState } from 'react'
import { AiChat, Card, Badge, Button, Separator } from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

const MOCK_USAGE = {
  todayCost: 2.47,
  totalTokens: 184_230,
  requests: 42,
  avgLatency: 1.2,
}

export default function Home() {
  const [showChat, setShowChat] = useState(true)

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <header className={cn('flex items-center justify-between px-4 py-2 border-b', mode.color.border.default)}>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold uppercase tracking-wider">AI SAAS</h1>
          <Badge className="text-xs">[FABRK]</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>TOKENS: <span className="text-primary font-bold">{MOCK_USAGE.totalTokens.toLocaleString()}</span></span>
          <span>COST: <span className="text-primary font-bold">${MOCK_USAGE.todayCost.toFixed(2)}</span></span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? '> METRICS' : '> CHAT'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      {showChat ? (
        <div className="flex-1 overflow-hidden">
          <AiChat />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <h2 className="text-xl font-bold uppercase">[USAGE METRICS]</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={cn('p-4 border border-border', mode.radius)}>
              <p className="text-xs text-muted-foreground uppercase">TODAY COST</p>
              <p className="text-2xl font-bold text-primary">${MOCK_USAGE.todayCost.toFixed(2)}</p>
            </Card>
            <Card className={cn('p-4 border border-border', mode.radius)}>
              <p className="text-xs text-muted-foreground uppercase">TOTAL TOKENS</p>
              <p className="text-2xl font-bold text-primary">{MOCK_USAGE.totalTokens.toLocaleString()}</p>
            </Card>
            <Card className={cn('p-4 border border-border', mode.radius)}>
              <p className="text-xs text-muted-foreground uppercase">REQUESTS</p>
              <p className="text-2xl font-bold text-primary">{MOCK_USAGE.requests}</p>
            </Card>
            <Card className={cn('p-4 border border-border', mode.radius)}>
              <p className="text-xs text-muted-foreground uppercase">AVG LATENCY</p>
              <p className="text-2xl font-bold text-primary">{MOCK_USAGE.avgLatency}s</p>
            </Card>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase">[RECENT ACTIVITY]</h3>
            <Card className={cn('p-4 border border-border font-mono text-sm space-y-2', mode.radius)}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">14:32:01</span>
                <span className="text-primary">GPT-4o</span>
                <span>1,240 tokens</span>
                <span className="text-muted-foreground">$0.04</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">14:31:45</span>
                <span className="text-primary">Claude 3.5</span>
                <span>890 tokens</span>
                <span className="text-muted-foreground">$0.02</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">14:30:12</span>
                <span className="text-primary">GPT-4o</span>
                <span>2,100 tokens</span>
                <span className="text-muted-foreground">$0.07</span>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase">[CONFIGURATION]</h3>
            <Card className={cn('p-4 border border-border font-mono text-xs space-y-1', mode.radius)}>
              <p className="text-muted-foreground">// fabrk.config.ts</p>
              <p>{'export default createFabrkConfig({'}</p>
              <p className="pl-4">{'ai: {'}</p>
              <p className="pl-8 text-primary">{'defaultProvider: "openai",'}</p>
              <p className="pl-8 text-primary">{'costTracking: true,'}</p>
              <p className="pl-8 text-primary">{'maxCostPerDay: 50,'}</p>
              <p className="pl-4">{'}'}</p>
              <p>{'})'};</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
