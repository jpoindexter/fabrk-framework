'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type NavItem, navigation } from './navigation'
import { STATS } from '@/data/stats'

function MobileNavGroup({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
  const hasActiveChild = item.children?.some(child => pathname === child.href)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isActive || hasActiveChild) setOpen(true)
  }, [isActive, hasActiveChild])

  if (!item.children) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'block px-3 py-2 text-xs transition-colors',
          mode.font,
          isActive
            ? 'text-primary bg-primary/10 border-l-2 border-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        )}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          onClick={onClose}
          className={cn(
            'flex-1 px-3 py-2 text-xs transition-colors',
            mode.font,
            isActive || hasActiveChild
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          )}
        >
          {item.label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Collapse section' : 'Expand section'}
          className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={cn(
                'block px-3 py-1.5 text-xs transition-colors',
                mode.font,
                pathname === child.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={cn(
          'fixed top-4 left-4 z-50 flex items-center justify-center h-10 w-10 border border-border bg-card md:hidden',
          mode.radius
        )}
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-4 overflow-y-auto transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <Link href="/" onClick={() => setOpen(false)}>
            <div className={cn('text-primary font-bold text-lg', mode.font)}>
              {'>'} FABRK
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-0.5">
          {navigation.map((item) => (
            <MobileNavGroup key={item.href} item={item} onClose={() => setOpen(false)} />
          ))}
        </nav>

        <div className="mt-8 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>[v{STATS.version}]</div>
            <div>{STATS.packages} packages</div>
            <div>{STATS.components} components</div>
          </div>
        </div>
      </aside>
    </>
  )
}
