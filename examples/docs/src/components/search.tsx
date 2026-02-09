'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchEntry {
  title: string
  href: string
  keywords: string[]
  category?: string
}

const SEARCH_INDEX: SearchEntry[] = [
  // Pages
  { title: 'Home', href: '/', keywords: ['home', 'overview', 'introduction', 'framework', 'ai agents'], category: 'PAGES' },
  { title: 'Getting Started', href: '/getting-started', keywords: ['install', 'setup', 'quickstart', 'scaffold', 'create', 'npx', 'prerequisites', 'node', 'pnpm'], category: 'PAGES' },
  { title: 'Configuration', href: '/configuration', keywords: ['config', 'fabrk.config.ts', 'zod', 'defineFabrkConfig', 'settings', 'options'], category: 'PAGES' },
  { title: 'Packages', href: '/packages', keywords: ['packages', 'modules', 'npm', 'dependencies', 'architecture'], category: 'PAGES' },
  { title: 'Components', href: '/components', keywords: ['components', 'ui', 'react', 'library', 'design rules', 'terminal'], category: 'PAGES' },
  { title: 'CLI Reference', href: '/cli', keywords: ['cli', 'command line', 'create-fabrk-app', 'fabrk dev', 'generate', 'scaffold', 'templates'], category: 'PAGES' },
  { title: 'Guides', href: '/guides', keywords: ['guides', 'tutorials', 'how to', 'step by step', 'walkthrough'], category: 'PAGES' },
  { title: 'Migration', href: '/migration', keywords: ['migration', 'migrate', 'upgrade', 'transform', 'imports', 'existing project', 'convert'], category: 'PAGES' },

  // Packages
  { title: '@fabrk/core', href: '/packages#core', keywords: ['core', 'runtime', 'plugins', 'middleware', 'auto-wiring', 'autoWire', 'cn', 'hooks', 'providers', 'FabrkProvider'], category: 'PACKAGES' },
  { title: '@fabrk/config', href: '/packages#config', keywords: ['config', 'zod', 'schema', 'validation', 'defineFabrkConfig', 'type-safe'], category: 'PACKAGES' },
  { title: '@fabrk/design-system', href: '/packages#design-system', keywords: ['design system', 'themes', 'mode', 'tokens', 'css variables', 'applyTheme', 'radius', 'font'], category: 'PACKAGES' },
  { title: '@fabrk/components', href: '/packages#components', keywords: ['components', 'ui', 'button', 'card', 'input', 'chart', 'table', 'form', 'badge'], category: 'PACKAGES' },
  { title: '@fabrk/ai', href: '/packages#ai', keywords: ['ai', 'llm', 'openai', 'claude', 'anthropic', 'cost tracking', 'streaming', 'embeddings', 'prompts'], category: 'PACKAGES' },
  { title: '@fabrk/themes', href: '/packages#themes', keywords: ['themes', 'ThemeProvider', 'chart colors', 'formatters', 'mode'], category: 'PACKAGES' },
  { title: '@fabrk/payments', href: '/packages#payments', keywords: ['payments', 'stripe', 'polar', 'lemon squeezy', 'checkout', 'subscriptions', 'webhooks'], category: 'PACKAGES' },
  { title: '@fabrk/auth', href: '/packages#auth', keywords: ['auth', 'authentication', 'nextauth', 'api keys', 'mfa', 'totp', 'backup codes', 'session'], category: 'PACKAGES' },
  { title: '@fabrk/email', href: '/packages#email', keywords: ['email', 'resend', 'console', 'templates', 'verification', 'welcome', 'invite'], category: 'PACKAGES' },
  { title: '@fabrk/storage', href: '/packages#storage', keywords: ['storage', 's3', 'r2', 'cloudflare', 'filesystem', 'upload', 'signed url'], category: 'PACKAGES' },
  { title: '@fabrk/security', href: '/packages#security', keywords: ['security', 'csrf', 'csp', 'rate limiting', 'audit', 'gdpr', 'cors', 'bot protection', 'headers'], category: 'PACKAGES' },
  { title: '@fabrk/mcp', href: '/packages#mcp', keywords: ['mcp', 'model context protocol', 'tools', 'schema', 'server'], category: 'PACKAGES' },
  { title: '@fabrk/store-prisma', href: '/packages#store-prisma', keywords: ['prisma', 'database', 'store', 'postgresql', 'team store', 'audit store', 'adapters'], category: 'PACKAGES' },
  { title: '@fabrk/ui', href: '/packages#ui', keywords: ['ui', 'registry', 'shadcn', 'component registry', 'metadata'], category: 'PACKAGES' },
  { title: '@fabrk/referrals', href: '/packages#referrals', keywords: ['referrals', 'referral codes', 'tracking', 'rewards', 'multi-tier'], category: 'PACKAGES' },

  // Key Components
  { title: 'DashboardShell', href: '/components#layout', keywords: ['dashboard', 'shell', 'sidebar', 'layout', 'navigation'], category: 'COMPONENTS' },
  { title: 'KPICard', href: '/components#data-display', keywords: ['kpi', 'metrics', 'statistics', 'card', 'trend', 'indicator'], category: 'COMPONENTS' },
  { title: 'DataTable', href: '/components#data-display', keywords: ['table', 'data', 'sortable', 'filterable', 'pagination', 'columns'], category: 'COMPONENTS' },
  { title: 'BarChart', href: '/components#charts', keywords: ['bar chart', 'chart', 'visualization', 'data viz'], category: 'COMPONENTS' },
  { title: 'LineChart', href: '/components#charts', keywords: ['line chart', 'chart', 'trend', 'visualization'], category: 'COMPONENTS' },
  { title: 'AreaChart', href: '/components#charts', keywords: ['area chart', 'chart', 'filled', 'visualization'], category: 'COMPONENTS' },
  { title: 'PieChart', href: '/components#charts', keywords: ['pie chart', 'chart', 'donut', 'visualization'], category: 'COMPONENTS' },
  { title: 'DonutChart', href: '/components#charts', keywords: ['donut chart', 'chart', 'pie', 'center label'], category: 'COMPONENTS' },
  { title: 'FunnelChart', href: '/components#charts', keywords: ['funnel chart', 'conversion', 'visualization'], category: 'COMPONENTS' },
  { title: 'Gauge', href: '/components#charts', keywords: ['gauge', 'meter', 'circular', 'progress'], category: 'COMPONENTS' },
  { title: 'Sparkline', href: '/components#charts', keywords: ['sparkline', 'mini chart', 'inline'], category: 'COMPONENTS' },
  { title: 'ChatInput', href: '/components#ai', keywords: ['chat', 'input', 'ai', 'message', 'send'], category: 'COMPONENTS' },
  { title: 'ChatMessageList', href: '/components#ai', keywords: ['chat', 'messages', 'ai', 'streaming', 'conversation'], category: 'COMPONENTS' },
  { title: 'NotificationCenter', href: '/components#admin', keywords: ['notifications', 'center', 'dropdown', 'badge', 'unread'], category: 'COMPONENTS' },
  { title: 'MfaCard', href: '/components#security', keywords: ['mfa', 'two factor', '2fa', 'totp', 'authentication'], category: 'COMPONENTS' },
  { title: 'PricingCard', href: '/components#marketing', keywords: ['pricing', 'plans', 'subscription', 'tiers', 'marketing'], category: 'COMPONENTS' },
  { title: 'ErrorBoundary', href: '/components#feedback', keywords: ['error', 'boundary', 'fallback', 'crash', 'recovery'], category: 'COMPONENTS' },
  { title: 'Button', href: '/components#form-controls', keywords: ['button', 'click', 'action', 'submit', 'form'], category: 'COMPONENTS' },
  { title: 'Badge', href: '/components#data-display', keywords: ['badge', 'status', 'label', 'tag', 'indicator'], category: 'COMPONENTS' },
  { title: 'Card', href: '/components#layout', keywords: ['card', 'container', 'content', 'box', 'panel'], category: 'COMPONENTS' },
  { title: 'Dialog', href: '/components#feedback', keywords: ['dialog', 'modal', 'popup', 'overlay'], category: 'COMPONENTS' },
  { title: 'Tabs', href: '/components#layout', keywords: ['tabs', 'navigation', 'tabbed', 'sections'], category: 'COMPONENTS' },
  { title: 'AuditLog', href: '/components#admin', keywords: ['audit', 'log', 'trail', 'history', 'admin'], category: 'COMPONENTS' },
  { title: 'OrgSwitcher', href: '/components#organization', keywords: ['org', 'organization', 'team', 'switcher', 'multi-tenant'], category: 'COMPONENTS' },
  { title: 'TerminalSpinner', href: '/components#feedback', keywords: ['spinner', 'loading', 'terminal', 'animation'], category: 'COMPONENTS' },
  { title: 'LogStream', href: '/components#ai', keywords: ['log', 'stream', 'realtime', 'output', 'terminal'], category: 'COMPONENTS' },

  // Key Concepts
  { title: 'Auto-wiring', href: '/configuration#auto-wiring', keywords: ['auto-wiring', 'autoWire', 'adapters', 'configuration', 'setup', 'zero-config'], category: 'CONCEPTS' },
  { title: 'Design Tokens', href: '/components#design-rules', keywords: ['design tokens', 'css variables', 'bg-primary', 'text-foreground', 'semantic colors', 'theming'], category: 'CONCEPTS' },
  { title: 'mode Object', href: '/packages#design-system', keywords: ['mode', 'mode.radius', 'mode.font', 'mode.shadow', 'design system', 'runtime'], category: 'CONCEPTS' },
  { title: 'Middleware', href: '/packages#core', keywords: ['middleware', 'auth', 'rateLimit', 'cors', 'csrf', 'request pipeline'], category: 'CONCEPTS' },
  { title: 'Store Pattern', href: '/migration#step-6:-wire-store-adapters', keywords: ['store', 'adapter', 'in-memory', 'prisma', 'injectable', 'interface', 'StoreOverrides'], category: 'CONCEPTS' },
  { title: 'Feature Flags', href: '/configuration#feature-flags', keywords: ['feature flags', 'flags', 'rollout', 'a/b testing', 'useFeatureFlag'], category: 'CONCEPTS' },
  { title: 'Terminal Aesthetic', href: '/components#design-rules', keywords: ['terminal', 'monospace', 'uppercase', 'brackets', 'aesthetic', 'casing'], category: 'CONCEPTS' },
  { title: 'Callback Props', href: '/migration#step-4:-component-extraction-pattern', keywords: ['callback', 'props', 'pattern', 'portable', 'testable', 'no api calls'], category: 'CONCEPTS' },
  { title: 'Zero-config Development', href: '/getting-started#step-3:-configure-fabrk', keywords: ['zero-config', 'dev defaults', 'applyDevDefaults', 'console email', 'in-memory'], category: 'CONCEPTS' },

  // Guides
  { title: 'Build a Dashboard', href: '/guides#dashboard', keywords: ['dashboard', 'kpi', 'charts', 'tables', 'sidebar', 'admin'], category: 'GUIDES' },
  { title: 'Authentication Guide', href: '/guides#auth', keywords: ['auth', 'nextauth', 'api keys', 'mfa', 'totp', 'login'], category: 'GUIDES' },
  { title: 'Payments Guide', href: '/guides#payments', keywords: ['payments', 'stripe', 'checkout', 'webhooks', 'pricing', 'subscription'], category: 'GUIDES' },
  { title: 'AI Integration Guide', href: '/guides#ai', keywords: ['ai', 'llm', 'cost tracking', 'chat', 'prompts', 'streaming', 'budget'], category: 'GUIDES' },
  { title: 'Deployment Guide', href: '/guides#deployment', keywords: ['deploy', 'vercel', 'production', 'database', 'environment', 'checklist'], category: 'GUIDES' },
]

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export function Search() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const results = query.length > 0
    ? SEARCH_INDEX.filter((entry) => {
        const q = query.toLowerCase()
        return (
          entry.title.toLowerCase().includes(q) ||
          entry.keywords.some((kw) => kw.toLowerCase().includes(q))
        )
      })
    : []

  // Group results by category
  const grouped = results.reduce<Record<string, SearchEntry[]>>((acc, entry) => {
    const cat = entry.category || 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(entry)
    return acc
  }, {})

  const flatResults = results

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      setSelectedIndex(0)
      router.push(href)
    },
    [router]
  )

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Keyboard navigation inside dialog
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault()
        navigate(flatResults[selectedIndex].href)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, flatResults, selectedIndex, navigate])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full max-w-lg border border-border bg-card shadow-lg',
          mode.radius
        )}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <span className="text-muted-foreground text-xs mr-2">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH DOCS..."
            className={cn(
              'flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none',
              mode.font
            )}
          />
          <kbd className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-2"
        >
          {query.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              TYPE TO SEARCH DOCUMENTATION
            </div>
          )}

          {query.length > 0 && flatResults.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              NO RESULTS FOR &quot;{query.toUpperCase()}&quot;
            </div>
          )}

          {Object.entries(grouped).map(([category, entries]) => {
            return (
              <div key={category} className="mb-2">
                <div className={cn('px-3 py-1.5 text-xs text-muted-foreground', mode.font)}>
                  [{category}]
                </div>
                {entries.map((entry) => {
                  const globalIndex = flatResults.indexOf(entry)
                  const isSelected = globalIndex === selectedIndex

                  return (
                    <button
                      key={entry.href}
                      data-selected={isSelected}
                      onClick={() => navigate(entry.href)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                        mode.font,
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary/50'
                      )}
                    >
                      <span className="text-xs text-muted-foreground">{'>'}</span>
                      <span>{highlightMatch(entry.title, query)}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {flatResults.length > 0 && (
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="border border-border px-1">&#8593;</kbd>
              <kbd className="border border-border px-1">&#8595;</kbd>
              NAVIGATE
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-border px-1">&#9166;</kbd>
              SELECT
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-border px-1">ESC</kbd>
              CLOSE
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function SearchTrigger() {
  const [, setOpen] = useState(false)

  function handleClick() {
    // Dispatch keyboard shortcut to open the search
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground',
        mode.font, mode.radius
      )}
    >
      <span>{'>'}</span>
      <span className="flex-1 text-left">SEARCH...</span>
      <kbd className="border border-border px-1.5 py-0.5 text-xs">
        <span className="text-[10px]">&#8984;</span>K
      </kbd>
    </button>
  )
}
