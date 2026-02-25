/**
 * EmptyState - Placeholder for empty views with optional icon, description, and CTA button.
 * Uses `formatButtonText` from the design system for terminal-style button labels.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={FolderOpen}
 *   title="NO PROJECTS YET"
 *   description="Create your first project to get started."
 *   action={{ label: "Create Project", onClick: () => openModal() }}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode, formatButtonText } from '@fabrk/design-system';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      {Icon && (
        <div
          className={cn(
            'mb-4 border p-4',
            mode.color.bg.muted,
            mode.color.border.default,
            mode.radius
          )}
        >
          <Icon className={cn('size-12', mode.color.text.muted)} />
        </div>
      )}
      <h3 className={cn('mb-2 text-sm font-semibold', mode.color.text.primary, mode.font)}>
        {title}
      </h3>
      {description && (
        <p className={cn('mb-4 max-w-sm text-xs', mode.color.text.muted, mode.font)}>
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="text-xs">
          {formatButtonText(action.label)}
        </Button>
      )}
    </div>
  );
}
