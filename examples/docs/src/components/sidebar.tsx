'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type NavItem, navigation } from './navigation'
import { Search, SearchTrigger } from './search'
import { ThemeSwitcher } from './theme-switcher'
import { STATS } from '@/data/stats'

function NavGroup({ item }: { item: NavItem }) {
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

export function Sidebar() {
  return (
    <aside data-sidebar className="hidden md:block w-64 border-r border-border bg-card sticky top-0 h-screen p-4 shrink-0 overflow-y-auto">
      <Link href="/" className="block mb-6">
        <div className={cn('text-primary font-bold text-lg', mode.font)}>
          {'>'} FABRK
        </div>
        <div className="text-muted-foreground text-xs mt-1">
          [FRAMEWORK FOR AI AGENTS]
        </div>
      </Link>

      <div className="mb-4">
        <SearchTrigger />
      </div>

      <Search />

      <nav className="space-y-0.5">
        {navigation.map((item) => (
          <NavGroup key={item.href} item={item} />
        ))}
      </nav>

      <ThemeSwitcher />

      <div className="mt-4 border-t border-border pt-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>[v{STATS.version}]</div>
          <div>{STATS.packages} packages</div>
          <div>{STATS.components} components</div>
          <div>{STATS.tests}+ tests</div>
        </div>
      </div>
    </aside>
  )
}
