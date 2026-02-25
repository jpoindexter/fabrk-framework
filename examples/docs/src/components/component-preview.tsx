'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { useState } from 'react'

interface ComponentPreviewProps {
  children: React.ReactNode
  code: string
  title?: string
}

export function ComponentPreview({ children, code, title }: ComponentPreviewProps) {
  const [view, setView] = useState<'preview' | 'code'>('preview')

  return (
    <div className={cn('border border-border overflow-hidden my-4', mode.radius)}>
      {title && (
        <div className="px-4 py-2 border-b border-border bg-muted">
          <span className={cn('text-xs font-bold text-muted-foreground uppercase', mode.font)}>
            {title}
          </span>
        </div>
      )}

      <div className="flex border-b border-border">
        <button
          onClick={() => setView('preview')}
          className={cn(
            'px-4 py-2 text-xs uppercase transition-colors',
            mode.font,
            view === 'preview'
              ? 'text-primary bg-primary/10 border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          PREVIEW
        </button>
        <button
          onClick={() => setView('code')}
          className={cn(
            'px-4 py-2 text-xs uppercase transition-colors',
            mode.font,
            view === 'code'
              ? 'text-primary bg-primary/10 border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          CODE
        </button>
      </div>

      {view === 'preview' ? (
        <div className="p-6 bg-background min-h-[120px] flex items-center justify-center">
          <div className="w-full max-w-xl">{children}</div>
        </div>
      ) : (
        <pre className="p-4 bg-card overflow-x-auto text-sm text-card-foreground">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
