import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { sanitizeHref } from '../../utils';
import { generateHexFromTitle } from './utils';
import { FeatureCardHeader } from './feature-card-header';
import { FeatureCardStats } from './feature-card-stats';
import { FeatureCardIncludes } from './feature-card-includes';

export type FeatureCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hex code for header */
  code?: string;
  /** Header title in SNAKE_CASE */
  title: string;
  /** Icon for header */
  icon?: React.ReactNode;
  /** Main headline text */
  headline: string;
  /** Description paragraph */
  description: string;
  /** Stats to display in band (2 max) */
  stats?: Array<{ label: string; value: string }>;
  /** Features included list */
  includes?: string[];
  /** CTA button label */
  ctaLabel?: string;
  /** CTA button href */
  ctaHref?: string;
};

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ code, title, icon, headline, description, stats, includes, ctaLabel, ctaHref, className, ...props }, ref) => {
    const hexCode = code ?? generateHexFromTitle(title);

    return (
      <div
        ref={ref}
        data-slot="feature-card"
        className={cn(
          'relative flex flex-col border',
          mode.color.bg.surface,
          mode.color.border.default,
          mode.radius,
          'group transition-colors',
          mode.state.hover.card,
          className
        )}
        {...props}
      >
        <FeatureCardHeader hexCode={hexCode} title={title} icon={icon} />

        <div className="flex flex-col p-6 pb-0">
          <h3
            className={cn(
              'text-sm font-bold leading-tight uppercase tracking-wide line-clamp-2 min-h-line-2',
              mode.font,
              'text-foreground'
            )}
          >
            {headline}
          </h3>
          <p
            className={cn(
              'text-sm leading-relaxed mt-3 line-clamp-3 min-h-line-3',
              mode.font,
              mode.color.text.muted
            )}
          >
            {description}
          </p>
        </div>

        {stats && stats.length > 0 && <FeatureCardStats stats={stats} />}
        {includes && includes.length > 0 && <FeatureCardIncludes includes={includes} />}

        {ctaLabel && ctaHref && (
          <div className="p-6 pt-0 mt-auto">
            <a
              href={sanitizeHref(ctaHref)}
              className={cn(
                'flex items-center justify-center gap-2 w-full h-10 border text-xs font-medium',
                'bg-transparent transition-all duration-200',
                mode.color.border.default,
                mode.color.text.muted,
                mode.radius,
                mode.font,
                'hover:border-warning hover:text-warning'
              )}
            >
              &gt; {ctaLabel}
              <span className="text-sm">{'\u2192'}</span>
            </a>
          </div>
        )}
      </div>
    );
  }
);
FeatureCard.displayName = 'FeatureCard';

export { FeatureCard };
