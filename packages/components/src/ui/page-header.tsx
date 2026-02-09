/**
 * FABRK COMPONENT
 * PageHeader - Swiss/International typographic page header with tabs and search
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Components"
 *   totalCount={279}
 *   tabs={[
 *     { value: "all", label: "All", count: 279 },
 *     { value: "ui", label: "UI", count: 183 },
 *     { value: "charts", label: "Charts", count: 8 },
 *   ]}
 *   activeTab="all"
 *   onTabChange={setActiveTab}
 *   searchQuery={query}
 *   onSearchChange={setQuery}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Button } from './button';
import { Input } from './input';

export interface FilterTab {
  value: string;
  label: string;
  count?: number;
}

export interface PageHeaderProps {
  title: string;
  totalCount?: number;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  totalCount,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search',
  tabs = [],
  activeTab = 'all',
  onTabChange,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={className}>
      {/* Title Row */}
      <div className="px-4 pt-8 pb-4">
        <h1
          className={cn(
            'text-2xl font-bold uppercase tracking-tight',
            mode.font,
          )}
        >
          {title}
        </h1>
        {totalCount !== undefined && (
          <p className={cn('mt-1 tabular-nums text-sm text-muted-foreground', mode.font)}>
            {totalCount.toLocaleString()} entries
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border" />

      {/* Controls Row */}
      <div className="flex items-center justify-between px-4 py-4">
        {/* Left: Filter tabs */}
        {tabs.length > 0 && onTabChange ? (
          <nav className="flex items-center gap-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <Button
                  key={tab.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange(tab.value)}
                  className={cn(
                    'text-xs transition-opacity',
                    mode.font,
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 tabular-nums text-muted-foreground">
                      {tab.count}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>
        ) : (
          <div />
        )}

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-4">
          {onSearchChange && (
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'w-48 border-0 border-b bg-transparent placeholder:opacity-30',
                mode.font,
              )}
            />
          )}
          {actions}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border" />
    </header>
  );
}
