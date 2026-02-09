/**
 * StyledTabs - Standardized tabs component with card header
 *
 * This component enforces consistent tab styling across all templates.
 * Automatically adapts to the current visual mode (sharp/standard/minimal).
 * Use this instead of manually styling Tabs/TabsList/TabsTrigger.
 *
 * @example
 * ```tsx
 * <StyledTabs
 *  
 *   title="NAVIGATION"
 *   tabs={[
 *     { id: "tab1", label: "FIRST TAB" },
 *     { id: "tab2", label: "SECOND TAB", icon: Settings },
 *   ]}
 *   value={activeTab}
 *   onValueChange={setActiveTab}
 * >
 *   <StyledTabsContent value="tab1">Content 1</StyledTabsContent>
 *   <StyledTabsContent value="tab2">Content 2</StyledTabsContent>
 * </StyledTabs>
 * ```
 */

'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Card, CardHeader } from './card';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { LucideIcon } from 'lucide-react';

export interface StyledTab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface StyledTabsProps {
  /** Header code (e.g., "0x00") - optional */
  code?: string;
  /** Header title (e.g., "NAVIGATION") - optional */
  title?: string;
  /** Array of tab definitions */
  tabs: StyledTab[];
  /** Currently active tab id */
  value: string;
  /** Callback when tab changes */
  onValueChange: (value: string) => void;
  /** Tab content as children */
  children: React.ReactNode;
  /** Optional className for the outer container */
  className?: string;
  /** Optional description shown below tabs */
  description?: string | ((activeTab: string) => string);
}

export function StyledTabs({
  code: _code,
  title,
  tabs,
  value,
  onValueChange,
  children,
  className,
  description,
}: StyledTabsProps) {
  const descriptionText = typeof description === 'function' ? description(value) : description;

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <Card tone="neutral">
        {title && <CardHeader title={title} />}
        <TabsList>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                {Icon && <Icon className="h-3 w-3" />}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {descriptionText && (
          <div
            className={cn('text-muted-foreground border-border border-t p-4 text-xs', mode.font)}
          >
            [SELECTED]: {descriptionText}
          </div>
        )}
      </Card>
      {children}
    </Tabs>
  );
}

export interface StyledTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Content panel for StyledTabs
 * Automatically applies floating spacing (mt-6)
 */
export function StyledTabsContent({ value, children, className }: StyledTabsContentProps) {
  return (
    <TabsContent value={value} className={cn('mt-6', className)}>
      {children}
    </TabsContent>
  );
}

export { StyledTabs as default };
