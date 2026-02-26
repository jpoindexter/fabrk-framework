'use client'

import Link from 'next/link'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the docs sidebar, mobile nav, and TOC on this route */}
      <style>{`
        [data-sidebar], [data-mobile-nav], [data-toc] { display: none !important; }
        main { margin-left: 0 !important; }
      `}</style>
      {/* Floating back link */}
      <div className="fixed top-3 right-3 z-[60]">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-1.5 border border-border bg-card/95 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors',
            mode.radius
          )}
        >
          &larr; BACK TO DOCS
        </Link>
      </div>
      {children}
    </>
  )
}
