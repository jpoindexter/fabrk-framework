/**
 * Card - Core card primitives for the codebase
 * One shell, content is composition. Variants control tone, size, and interactivity.
 *
 * Design System Integration:
 * - Imports from @/design-system for static mode (server components)
 * - Radius from visual mode config (mode.radius applies the correct value)
 * - Spacing follows 8-point grid
 *
 * Size Guide:
 * - "auto": Natural height, use for standalone cards, notes, badges
 * - "full": h-full for equal-height grids (default)
 *
 * @example
 * ```tsx
 * // Grid card (equal heights)
 * <Card tone="primary" interactive>
 *   <CardHeader title="TITLE" icon={<Icon />} />
 *   <CardContent>Any content here</CardContent>
 * </Card>
 *
 * // Standalone card (natural height)
 * <Card size="auto">
 *   <CardContent>Note content</CardContent>
 * </Card>
 * ```
 */

import * as React from 'react';

import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

/**
 * Card - Core card component
 * One shell, content is composition. Variants control tone, size, and interactivity.
 */
export type CardTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type CardSize = 'auto' | 'full';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Color tone for border */
  tone?: CardTone;
  /** Size behavior: "auto" = natural height, "full" = h-full for grids */
  size?: CardSize;
  /** Enable hover/focus states for interactive cards */
  interactive?: boolean;
  /** Semantic HTML element */
  as?: 'div' | 'article' | 'section';
};

const toneBorderStyles: Record<CardTone, string> = {
  neutral: mode.color.border.default,
  primary: mode.color.border.accent,
  success: mode.color.border.success,
  warning: mode.color.border.warning,
  danger: mode.color.border.danger,
};

const toneBgStyles: Record<CardTone, string> = {
  neutral: mode.color.bg.surface,
  primary: mode.color.bg.primaryLight,
  success: mode.color.bg.successMuted,
  warning: mode.color.bg.warningMuted,
  danger: mode.color.bg.dangerMuted,
};

const sizeStyles: Record<CardSize, string> = {
  auto: '',
  full: 'h-full',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      tone = 'neutral',
      size = 'full',
      interactive = false,
      as: Component = 'div',
      ...props
    },
    ref
  ) => (
    <Component
      ref={ref}
      data-slot="card"
      className={cn(
        'crt-scanlines relative flex flex-col border overflow-hidden',
        toneBgStyles[tone],
        mode.radius,
        toneBorderStyles[tone],
        sizeStyles[size],
        interactive && cn('group transition-colors', mode.state.hover.card),
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

/**
 * CardHeader - Clean header with title
 */
export type CardHeaderProps = {
  /** Title displayed in header */
  title: string;
  /** Optional icon displayed on the right side of header */
  icon?: React.ReactNode;
  /** Optional metadata displayed on right (e.g., "8 items") */
  meta?: React.ReactNode;
  /** Optional className for additional styling */
  className?: string;
};

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, icon, meta, className }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card-header"
        className={cn(
          'flex items-center justify-between border-b px-4 py-2',
          mode.color.border.default,
          'last:border-b-0', // Remove bottom border when CardHeader is last child (no CardContent)
          className
        )}
      >
        <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
          {title}
        </span>
        {(icon || meta) && (
          <span className="flex items-center gap-2">
            {meta && (
              <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
                {meta}
              </span>
            )}
            {icon}
          </span>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

/**
 * CardContent - Content area with configurable padding
 */
export type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
};

const paddingStyles = {
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn('flex-1', paddingStyles[padding], className)}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

/**
 * CardFooter - Footer area for actions
 */
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-2 border-t px-4 py-2',
        mode.color.border.default,
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };

// Re-export marketing components for convenience (also available from './terminal-card')
// Note: Badge is excluded to avoid conflict with './badge'
export {
  Stat,
  StatGroup,
  StyledLabel,
  FeatureItem,
  FeatureList,
  InfoNote,
  // Badge, // Excluded - use Badge from './badge' instead
  PageBadge,
  TemplatePageHeader,
  FeaturesCard,
  MetricCard,
  FeatureCard,
} from './terminal-card';

// Re-export types
// Note: BadgeProps is excluded to avoid conflict with './badge'
export type {
  StatProps,
  StatGroupProps,
  StyledLabelProps,
  FeatureItemProps,
  FeatureListProps,
  InfoNoteProps,
  // BadgeProps, // Excluded - use badgeVariants type from './badge' instead
  PageBadgeProps,
  TemplatePageHeaderProps,
  FeaturesCardProps,
  MetricCardProps,
  FeatureCardProps,
} from './terminal-card';
