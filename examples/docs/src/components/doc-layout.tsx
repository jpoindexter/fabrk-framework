'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

interface DocLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function DocLayout({ title, description, children }: DocLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      <div className="mb-8">
        <h1 className={cn('text-2xl font-bold text-foreground uppercase', mode.font)}>
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-muted-foreground text-sm">
            {description}
          </p>
        )}
        <div className="mt-4 border-b border-border" />
      </div>
      {children}
    </div>
  )
}

interface SectionProps {
  id?: string
  title: string
  children: React.ReactNode
}

export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
        [{title}]
      </h2>
      {children}
    </section>
  )
}

export function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-4">
      {title && (
        <div className="text-xs text-muted-foreground mb-1 uppercase">
          {title}
        </div>
      )}
      <pre className={cn('border border-border bg-card p-4 overflow-x-auto text-sm')}>
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn('border border-border bg-card p-4 mb-4', mode.radius)}>
      <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
        [{title}]
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  )
}
