'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, SearchTrigger } from './search'

interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  { label: 'HOME', href: '/' },
  { label: 'GETTING STARTED', href: '/getting-started' },
  { label: 'CONFIGURATION', href: '/configuration' },
  {
    label: 'PACKAGES',
    href: '/packages',
    children: [
      { label: '@fabrk/config', href: '/packages#config' },
      { label: '@fabrk/design-system', href: '/packages#design-system' },
      { label: '@fabrk/core', href: '/packages#core' },
      { label: '@fabrk/components', href: '/packages#components' },
      { label: '@fabrk/ai', href: '/packages#ai' },
      { label: '@fabrk/themes', href: '/packages#themes' },
      { label: '@fabrk/payments', href: '/packages#payments' },
      { label: '@fabrk/auth', href: '/packages#auth' },
      { label: '@fabrk/email', href: '/packages#email' },
      { label: '@fabrk/storage', href: '/packages#storage' },
      { label: '@fabrk/security', href: '/packages#security' },
      { label: '@fabrk/mcp', href: '/packages#mcp' },
      { label: '@fabrk/store-prisma', href: '/packages#store-prisma' },
      { label: '@fabrk/ui', href: '/packages#ui' },
      { label: '@fabrk/referrals', href: '/packages#referrals' },
    ],
  },
  { label: 'COMPONENTS', href: '/components' },
  {
    label: 'GUIDES',
    href: '/guides',
    children: [
      { label: 'Build a Dashboard', href: '/guides#dashboard' },
      { label: 'Authentication', href: '/guides#auth' },
      { label: 'Payments', href: '/guides#payments' },
      { label: 'AI Integration', href: '/guides#ai' },
      { label: 'Deployment', href: '/guides#deployment' },
    ],
  },
  {
    label: 'PHILOSOPHY',
    href: '/philosophy',
    children: [
      { label: 'Internationalization', href: '/philosophy#i18n' },
      { label: 'Data Fetching', href: '/philosophy#data-fetching' },
      { label: 'No CSS-in-JS', href: '/philosophy#no-css-in-js' },
      { label: 'Adapter Pattern', href: '/philosophy#adapter-pattern' },
      { label: 'Store Pattern', href: '/philosophy#store-pattern' },
    ],
  },
  { label: 'MIGRATION', href: '/migration' },
  { label: 'CLI REFERENCE', href: '/cli' },
  { label: 'API REFERENCE', href: '/api' },
  { label: 'STORYBOOK', href: '/storybook' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-4 shrink-0 overflow-y-auto">
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
                pathname === item.href
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

      <div className="mt-8 border-t border-border pt-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>[v0.1.0]</div>
          <div>16 packages</div>
          <div>105+ components</div>
          <div>1,400+ tests</div>
        </div>
      </div>
    </aside>
  )
}
