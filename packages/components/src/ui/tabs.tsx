/**
 * Tabs - Organize content into switchable panels with an underline-style tab bar.
 * Built on Radix UI Tabs with theme-aware styling and keyboard navigation.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <TabsList>
 *     <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
 *     <TabsTrigger value="settings">SETTINGS</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">Overview content here</TabsContent>
 *   <TabsContent value="settings">Settings content here</TabsContent>
 * </Tabs>
 * ```
 */

'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('w-full', className)}
      suppressHydrationWarning
      {...props}
    />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'flex h-auto w-full items-center justify-evenly border-b p-0',
        mode.color.border.default,
        mode.color.text.primary,
        // Note: No border-radius on TabsList - it only has border-bottom, radius would curl the underline
        mode.font,
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'border-b-2 border-transparent bg-transparent',
        mode.color.text.muted,
        'hover:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:font-semibold',
        mode.state.focus.ring,
        // Note: No border-radius on TabsTrigger - it uses underline style with border-b
        mode.font,
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'mt-4 focus-visible:ring-2 focus-visible:outline-none',
        mode.state.focus.ring,
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
