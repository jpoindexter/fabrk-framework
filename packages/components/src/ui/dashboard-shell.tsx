/**
 * FABRK COMPONENT
 * DashboardShell - Full dashboard layout with sidebar + header + content
 *
 * @example
 * ```tsx
 * <DashboardShell
 *   sidebarItems={[
 *     { id: 'repos', label: 'Repos', icon: <GitBranch />, href: '/dashboard/repos' },
 *     { id: 'settings', label: 'Settings', icon: <Settings />, href: '/dashboard/settings' },
 *   ]}
 *   user={{ name: "Jason", image: "/avatar.jpg", tier: "pro" }}
 *   logo={<span className="text-accent text-xl">#</span>}
 *   onSignOut={() => signOut()}
 * >
 *   <DashboardHeader title="Repositories" />
 *   <div className="p-4">...content...</div>
 * </DashboardShell>
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Button } from './button';
import { TierBadge } from './tier-badge';
import { Menu, X, LogOut } from 'lucide-react';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  active?: boolean;
}

export interface DashboardUser {
  name?: string | null;
  image?: string | null;
  email?: string | null;
  tier?: string;
}

export interface DashboardShellProps {
  children: React.ReactNode;
  sidebarItems: DashboardNavItem[];
  user?: DashboardUser;
  logo?: React.ReactNode;
  title?: string;
  activeItemId?: string;
  onItemClick?: (item: DashboardNavItem) => void;
  onSignOut?: () => void;
  linkComponent?: React.ElementType;
  className?: string;
}

export function DashboardShell({
  children,
  sidebarItems,
  user,
  logo,
  title = 'Dashboard',
  activeItemId,
  onItemClick,
  onSignOut,
  linkComponent: LinkComponent = 'a',
  className,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            {logo}
            <span className={cn('text-sm font-bold uppercase tracking-wider', mode.font)}>
              {title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 p-2">
          {sidebarItems.map((item) => {
            const isActive = item.active || item.id === activeItemId;
            const Wrapper = item.href ? LinkComponent : 'button';
            const wrapperProps = item.href ? { href: item.href } : { type: 'button' as const };

            return (
              <Wrapper
                key={item.id}
                {...wrapperProps}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors',
                  mode.font,
                  mode.radius,
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="flex-1 font-medium uppercase">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center px-1 text-xs font-semibold',
                      mode.radius,
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Wrapper>
            );
          })}
        </nav>

        {/* Sidebar Footer — User */}
        {user && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || ''}
                  className="size-8 rounded-full"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={cn('truncate text-xs font-medium', mode.font)}>
                  {user.name || user.email}
                </div>
                {user.tier && <TierBadge tier={user.tier} size="sm" showIcon={false} />}
              </div>
              {onSignOut && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="flex-shrink-0"
                >
                  <LogOut className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-2 border-b border-border p-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            {logo}
            <span className={cn('text-sm font-bold uppercase tracking-wider', mode.font)}>
              {title}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
