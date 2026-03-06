import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { PageBadge } from './page-badge';

export type TemplatePageHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Badge text (appears in [TEMPLATE]: BADGE) */
  badge: string;
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Badge prefix. Defaults to "TEMPLATE" */
  badgePrefix?: string;
};

const TemplatePageHeader = React.forwardRef<HTMLDivElement, TemplatePageHeaderProps>(
  ({ badge, title, description, badgePrefix = 'TEMPLATE', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="template-page-header"
      className={cn('space-y-2', className)}
      {...props}
    >
      <PageBadge prefix={badgePrefix}>{badge}</PageBadge>
      <h1 className={cn('text-4xl font-semibold tracking-tight', mode.font)}>{title}</h1>
      {description && (
        <p className={cn(mode.color.text.muted, mode.typography.body.m, mode.font)}>
          {description}
        </p>
      )}
    </div>
  )
);
TemplatePageHeader.displayName = 'TemplatePageHeader';

export { TemplatePageHeader };
