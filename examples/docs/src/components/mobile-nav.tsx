'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { navigation } from './navigation'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

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

        <nav className="space-y-1">
          {navigation.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-3 py-2 text-xs transition-colors',
                  mode.font,
                  pathname === item.href || pathname?.startsWith(item.href + '/')
                    ? 'text-primary bg-primary/10 border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
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
          ))}
        </nav>

        <div className="mt-8 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>[v0.1.0]</div>
            <div>16 packages</div>
            <div>105+ components</div>
          </div>
        </div>
      </aside>
    </>
  )
}
