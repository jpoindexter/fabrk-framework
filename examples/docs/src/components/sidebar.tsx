'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navigation } from './navigation'
import { Search, SearchTrigger } from './search'
import { ThemeSwitcher } from './theme-switcher'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:block w-64 border-r border-border bg-card min-h-screen p-4 shrink-0 overflow-y-auto">
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

      <nav className="space-y-1">
        {navigation.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
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

      <ThemeSwitcher />

      <div className="mt-4 border-t border-border pt-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>[v0.1.0]</div>
          <div>17 packages</div>
          <div>105+ components</div>
          <div>1,755+ tests</div>
        </div>
      </div>
    </aside>
  )
}
