'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getComponentDoc, COMPONENT_SLUGS } from '@/data/component-docs'
import { PropsTable } from '@/components/doc-layout'
import { ComponentPreview } from '@/components/component-preview'

export default function ComponentPageClient() {
  const params = useParams()
  const slug = params.slug as string
  const doc = getComponentDoc(slug)

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8">
        <h1 className={cn('text-2xl font-bold text-foreground uppercase', mode.font)}>
          COMPONENT NOT FOUND
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          No documentation for &quot;{slug}&quot;.{' '}
          <Link href="/components" className="text-primary hover:underline">
            Back to all components
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link href="/components" className="hover:text-foreground transition-colors">
          COMPONENTS
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{doc.name.toUpperCase()}</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className={cn('text-2xl font-bold text-foreground uppercase', mode.font)}>
            {doc.name}
          </h1>
          <span className={cn(
            'text-xs px-2 py-0.5 border border-border text-muted-foreground',
            mode.font, mode.radius
          )}>
            {doc.category.toUpperCase()}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{doc.description}</p>
        <div className="mt-4 border-b border-border" />
      </div>

      <section className="mb-12">
        <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
          [EXAMPLES]
        </h2>
        {doc.examples.map((example, i) => (
          <ComponentPreview key={i} title={example.title} code={example.source}>
            {example.element}
          </ComponentPreview>
        ))}
      </section>

      {doc.props.length > 0 && (
        <section className="mb-12">
          <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
            [PROPS]
          </h2>
          <PropsTable props={doc.props} />
        </section>
      )}

      {(doc.a11y.keyboard || doc.a11y.aria) && (
        <section className="mb-12">
          <h2 className={cn('text-lg font-semibold text-foreground uppercase mb-4', mode.font)}>
            [ACCESSIBILITY]
          </h2>
          {doc.a11y.keyboard && doc.a11y.keyboard.length > 0 && (
            <div className="mb-6">
              <h3 className={cn('text-sm font-semibold text-foreground uppercase mb-3', mode.font)}>
                KEYBOARD SHORTCUTS
              </h3>
              <div className={cn('border border-border overflow-x-auto', mode.radius)}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>KEY</th>
                      <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.a11y.keyboard.map((kb, i) => (
                      <tr key={i} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-primary font-bold whitespace-nowrap">
                          <kbd className={cn('bg-muted px-1.5 py-0.5 border border-border text-xs', mode.radius)}>{kb.key}</kbd>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{kb.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {doc.a11y.aria && doc.a11y.aria.length > 0 && (
            <div>
              <h3 className={cn('text-sm font-semibold text-foreground uppercase mb-3', mode.font)}>
                ARIA
              </h3>
              <ul className="space-y-1">
                {doc.a11y.aria.map((note, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary shrink-0">{'>'}</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="border-t border-border pt-6 flex justify-between">
        {(() => {
          const idx = COMPONENT_SLUGS.indexOf(slug)
          const prev = idx > 0 ? COMPONENT_SLUGS[idx - 1] : null
          const next = idx < COMPONENT_SLUGS.length - 1 ? COMPONENT_SLUGS[idx + 1] : null
          return (
            <>
              {prev ? (
                <Link href={`/components/${prev}`} className="text-sm text-primary hover:underline">
                  {'<'} {getComponentDoc(prev)?.name}
                </Link>
              ) : <span />}
              {next ? (
                <Link href={`/components/${next}`} className="text-sm text-primary hover:underline">
                  {getComponentDoc(next)?.name} {'>'}
                </Link>
              ) : <span />}
            </>
          )
        })()}
      </div>
    </div>
  )
}
