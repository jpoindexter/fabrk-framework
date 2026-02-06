'use client'

import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className={cn('text-2xl font-bold text-foreground uppercase', mode.font)}>
        FABRK BASIC EXAMPLE
      </h1>
      <p className="mt-4 text-muted-foreground">
        This example demonstrates basic usage of the FABRK Framework packages.
      </p>
      <div className={cn('mt-8 border border-border p-6', mode.radius)}>
        <h2 className="text-lg font-semibold text-foreground uppercase">
          [PACKAGES USED]
        </h2>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>@fabrk/core - Framework runtime and utilities</li>
          <li>@fabrk/components - UI components</li>
          <li>@fabrk/design-system - Themes and design tokens</li>
        </ul>
      </div>
    </main>
  )
}
