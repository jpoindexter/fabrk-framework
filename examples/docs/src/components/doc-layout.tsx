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
      <pre className={cn('border border-border bg-card text-card-foreground p-4 overflow-x-auto text-sm')}>
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

export interface PropDef {
  name: string
  type: string
  default?: string
  description: string
}

export function PropsTable({ props }: { props: PropDef[] }) {
  return (
    <div className={cn('border border-border overflow-x-auto my-4', mode.radius)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>PROP</th>
            <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>TYPE</th>
            <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>DEFAULT</th>
            <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>DESCRIPTION</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2 text-primary font-bold whitespace-nowrap">{prop.name}</td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap"><code>{prop.type}</code></td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{prop.default ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
