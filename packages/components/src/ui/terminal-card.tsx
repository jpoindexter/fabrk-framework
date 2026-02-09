/**
 * Terminal Card Components
 * Marketing-oriented card variants with terminal patterns
 * Used for feature showcases, metrics, and template documentation
 */

import * as React from 'react';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Card, CardHeader, CardContent } from './card';

/**
 * Stat - Key-value pair with label and highlighted value
 * Used in hero cards and stat displays
 *
 * @example
 * ```tsx
 * <StatGroup>
 *   <Stat label="Speed" value="OPTIMIZED" />
 *   <Stat label="Integration" value="SEAMLESS" />
 * </StatGroup>
 * ```
 */
export type StatProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Label text (muted color) */
  label: string;
  /** Value text (primary color) */
  value: string | number;
  /** Size variant */
  size?: 'sm' | 'md';
};

const Stat = React.forwardRef<HTMLSpanElement, StatProps>(
  ({ label, value, size = 'md', className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="stat"
      className={cn(size === 'sm' ? 'text-xs' : 'text-sm', className)}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.font)}>{label}:</span>{' '}
      <span className={cn(mode.color.text.accent, mode.font)}>{value}</span>
    </span>
  )
);
Stat.displayName = 'Stat';

/**
 * StatGroup - Container for multiple Stat components
 */
export type StatGroupProps = React.HTMLAttributes<HTMLDivElement>;

const StatGroup = React.forwardRef<HTMLDivElement, StatGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="stat-group"
      className={cn('flex flex-wrap gap-4', className)}
      {...props}
    />
  )
);
StatGroup.displayName = 'StatGroup';

/**
 * Bracketed label with brackets
 * Used for [LABEL]: patterns throughout templates
 *
 * @example
 * ```tsx
 * <StyledLabel>TEMPLATE FEATURES</StyledLabel>
 * // Renders: [TEMPLATE FEATURES]:
 * ```
 */
export type StyledLabelProps = React.HTMLAttributes<HTMLDivElement> & {
  /** The label text (will be wrapped in brackets with colon) */
  children: React.ReactNode;
  /** Whether to show the colon after the brackets */
  showColon?: boolean;
};

const StyledLabel = React.forwardRef<HTMLDivElement, StyledLabelProps>(
  ({ children, showColon = true, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="styled-label"
      className={cn(mode.color.text.muted, mode.typography.caption, mode.font, className)}
      {...props}
    >
      [{children}]{showColon ? ':' : ''}
    </div>
  )
);
StyledLabel.displayName = 'StyledLabel';

/**
 * Feature list item with > prefix
 * Used for listing features in template cards
 *
 * @example
 * ```tsx
 * <FeatureItem>Multi-step form wizard</FeatureItem>
 * // Renders: > Multi-step form wizard
 * ```
 */
export type FeatureItemProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Icon to use before text. Defaults to ">" */
  icon?: 'arrow' | 'check' | 'dot';
};

const FeatureItem = React.forwardRef<HTMLDivElement, FeatureItemProps>(
  ({ children, icon = 'arrow', className, ...props }, ref) => {
    const iconMap = {
      arrow: '>',
      check: '✓',
      dot: '•',
    };

    return (
      <div
        ref={ref}
        data-slot="feature-item"
        className={cn(mode.typography.caption, mode.font, className)}
        {...props}
      >
        <span className={mode.color.text.success}>{iconMap[icon]}</span> {children}
      </div>
    );
  }
);
FeatureItem.displayName = 'FeatureItem';

/**
 * Feature list container
 * Wraps multiple FeatureItem components
 *
 * @example
 * ```tsx
 * <FeatureList>
 *   <FeatureItem>Feature 1</FeatureItem>
 *   <FeatureItem>Feature 2</FeatureItem>
 * </FeatureList>
 * ```
 */
export type FeatureListProps = React.HTMLAttributes<HTMLDivElement>;

const FeatureList = React.forwardRef<HTMLDivElement, FeatureListProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="feature-list"
      className={cn('space-y-2', mode.typography.caption, mode.font, className)}
      {...props}
    >
      {children}
    </div>
  )
);
FeatureList.displayName = 'FeatureList';

/**
 * Note/info text
 * Used for [NOTE]: patterns at the bottom of feature cards
 *
 * @example
 * ```tsx
 * <InfoNote>Connect to your API to persist data.</InfoNote>
 * // Renders: [NOTE]: Connect to your API to persist data.
 * ```
 */
export type InfoNoteProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Label text. Defaults to "NOTE" */
  label?: string;
};

const InfoNote = React.forwardRef<HTMLDivElement, InfoNoteProps>(
  ({ children, label = 'NOTE', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="info-note"
      className={cn(mode.color.text.muted, 'mt-4', mode.typography.caption, mode.font, className)}
      {...props}
    >
      [{label}]: {children}
    </div>
  )
);
InfoNote.displayName = 'InfoNote';

/**
 * Page badge
 * Used for [TEMPLATE]: NAME badges at top of template pages
 *
 * @example
 * ```tsx
 * <PageBadge>SIGN IN</PageBadge>
 * // Renders: [TEMPLATE]: SIGN IN
 * ```
 */
export type PageBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Prefix label. Defaults to "TEMPLATE" */
  prefix?: string;
};

const PageBadge = React.forwardRef<HTMLDivElement, PageBadgeProps>(
  ({ children, prefix = 'TEMPLATE', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="page-badge"
      className={cn(
        'inline-block border px-4 py-1',
        mode.color.bg.surface,
        mode.color.border.default,
        mode.radius,
        className
      )}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
        [{prefix}]: {children}
      </span>
    </div>
  )
);
PageBadge.displayName = 'PageBadge';

/**
 * Template page header component
 * Combines badge, title, and description in a consistent layout
 *
 * @example
 * ```tsx
 * <TemplatePageHeader
 *   badge="SIGN IN"
 *   title="Sign In"
 *   description="Login page with social auth options"
 * />
 * ```
 */
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

/**
 * Features card with header and feature list
 * Complete card component for template feature documentation
 *
 * @example
 * ```tsx
 * <FeaturesCard
 *   title="TEMPLATE FEATURES"
 *   features={["Feature 1", "Feature 2"]}
 *   note="Connect to your API for real data."
 * />
 * ```
 */
export type FeaturesCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Card header title */
  title?: string;
  /** Hex code for header */
  code?: string;
  /** List of feature strings */
  features: string[];
  /** Optional note text at bottom */
  note?: string;
  /** Feature icon type */
  featureIcon?: 'arrow' | 'check' | 'dot';
};

const FeaturesCard = React.forwardRef<HTMLDivElement, FeaturesCardProps>(
  (
    {
      title = 'TEMPLATE FEATURES',
      code: _code = '0x00',
      features,
      note,
      featureIcon = 'arrow',
      className,
      ...props
    },
    ref
  ) => (
    <Card ref={ref} className={className} {...props}>
      <CardHeader title={title} />
      <CardContent>
        <StyledLabel className="mb-4">{title}</StyledLabel>
        <FeatureList>
          {features.map((feature, index) => (
            <FeatureItem key={index} icon={featureIcon}>
              {feature}
            </FeatureItem>
          ))}
        </FeatureList>
        {note && <InfoNote>{note}</InfoNote>}
      </CardContent>
    </Card>
  )
);
FeaturesCard.displayName = 'FeaturesCard';

// Generate deterministic hex code from string (consistent but varied)
function generateHexFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return (
    '0x' +
    Math.abs(hash % 256)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0')
  );
}

/**
 * MetricCard - Terminal-style stat/metric display card
 * Used for displaying key metrics with terminal header pattern
 *
 * @example
 * ```tsx
 * <MetricCard
 *  
 *   title="UI_COMPONENTS"
 *   value="77+"
 *   label="UI Components"
 *   icon={<Box className="size-5" />}
 * />
 * ```
 */
export type MetricCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hex code for header (e.g., "0x1A"). Auto-generates from title if not provided. */
  code?: string;
  /** Header title in SNAKE_CASE format */
  title: string;
  /** Large display value (e.g., "77+", "$199") */
  value: string | number;
  /** Label below value */
  label: string;
  /** Icon displayed in header right side */
  icon?: React.ReactNode;
};

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ code, title, value, label, icon, className, ...props }, ref) => {
    const hexCode = code ?? generateHexFromTitle(title);

    return (
      <div
        ref={ref}
        data-slot="metric-card"
        className={cn(
          'relative flex flex-col border',
          mode.color.bg.surface,
          mode.color.border.default,
          mode.radius,
          className
        )}
        {...props}
      >
        {/* Terminal Header */}
        <div
          className={cn(
            'flex h-11 shrink-0 items-center justify-between border-b px-4',
            mode.color.border.default
          )}
        >
          <span className={cn('text-xs tracking-wide', mode.font, mode.color.text.muted)}>
            [{hexCode}] {title}
          </span>
          {icon && <span className={mode.color.text.accent}>{icon}</span>}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          {/* Value */}
          <div className={cn('text-5xl font-bold leading-none', mode.font, mode.color.text.accent)}>
            {value}
          </div>

          {/* Label */}
          <div className={cn('mt-2 text-sm font-bold uppercase tracking-wide', mode.font)}>
            {label}
          </div>
        </div>
      </div>
    );
  }
);
MetricCard.displayName = 'MetricCard';

/**
 * FeatureCard - Terminal-style feature card with stats and includes
 * Full marketing feature card with header, description, stats band, feature list, and CTA
 *
 * @example
 * ```tsx
 * <FeatureCard
 *  
 *   title="EMAIL_SYSTEM"
 *   icon={<Mail className="size-5" />}
 *   headline="Transactional emails that just work"
 *   description="Resend integration with React Email templates..."
 *   stats={[
 *     { label: "TIME SAVED", value: "30+ HRS" },
 *     { label: "COST SAVED", value: "$3K" }
 *   ]}
 *   includes={["Resend Integration", "React Email Templates"]}
 *   ctaLabel="EMAIL TEMPLATES"
 *   ctaHref="/docs/features/email"
 * />
 * ```
 */
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
  (
    {
      code,
      title,
      icon,
      headline,
      description,
      stats,
      includes,
      ctaLabel,
      ctaHref,
      className,
      ...props
    },
    ref
  ) => {
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
        {/* Header */}
        <div
          className={cn(
            'flex h-11 shrink-0 items-center justify-between border-b px-4',
            mode.color.border.default
          )}
        >
          <span className={cn('text-xs tracking-wide', mode.font, mode.color.text.muted)}>
            [{hexCode}] {title}
          </span>
          {icon && <span className={mode.color.text.accent}>{icon}</span>}
        </div>

        {/* Main Content */}
        <div className="flex flex-col p-6 pb-0">
          {/* Headline - max 2 lines */}
          <h3
            className={cn(
              'text-sm font-bold leading-tight uppercase tracking-wide line-clamp-2 min-h-line-2',
              mode.font,
              'text-foreground'
            )}
          >
            {headline}
          </h3>

          {/* Description - fixed height for consistency */}
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

        {/* Stats Band */}
        {stats && stats.length > 0 && (
          <div className={cn('border-y border-border bg-background py-4 px-6 flex gap-4 mt-4')}>
            {stats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                {index > 0 && <div className="w-px bg-border" />}
                <div className={cn('flex-1 flex flex-col gap-1', index > 0 && 'pl-2')}>
                  <p
                    className={cn(
                      'text-xs uppercase tracking-caps font-medium',
                      mode.font,
                      mode.color.text.muted
                    )}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      'text-xl font-bold leading-none tracking-tight text-warning',
                      mode.font
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Includes List - always show 3 items for consistency */}
        {includes && includes.length > 0 && (
          <div className="p-6 flex flex-col gap-2">
            <p
              className={cn(
                'text-xs font-bold uppercase tracking-wider mb-1',
                mode.font,
                mode.color.text.muted
              )}
            >
              [INCLUDES]:
            </p>
            <ul className="flex flex-col gap-2">
              {includes.slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2 group/item">
                  <span className="font-bold text-sm mt-micro text-warning">✓</span>
                  <span
                    className={cn(
                      'text-sm group-hover/item:text-foreground transition-colors line-clamp-1',
                      mode.font,
                      mode.color.text.muted
                    )}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        {ctaLabel && ctaHref && (
          <div className="p-6 pt-0 mt-auto">
            <a
              href={ctaHref}
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
              <span className="text-sm">→</span>
            </a>
          </div>
        )}
      </div>
    );
  }
);
FeatureCard.displayName = 'FeatureCard';

/**
 * Badge - Inline badge for section headers
 * Used for section headers, page labels, and inline status indicators.
 * This is NOT a card - it's a compact inline element.
 *
 * NOTE: This is different from the Badge in badge.tsx which is for status indicators.
 *
 * @example
 * ```tsx
 * // Section header badge
 * <Badge label="SYSTEM INIT" meta="SAAS BOILERPLATE v2.0" />
 *
 * // Simple badge without meta
 * <Badge label="DEV EXPERIENCE" />
 * ```
 */
export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  /** @deprecated No longer used */
  code?: string;
  /** Primary label text */
  label: string;
  /** Optional metadata after the label (e.g., "v2.0") */
  meta?: string;
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ label, meta, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="badge"
      className={cn(
        'inline-block border px-2 py-1',
        mode.color.border.default,
        mode.color.bg.surface,
        mode.radius,
        className
      )}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
        {label}{meta ? ` ${meta}` : ''}
      </span>
    </div>
  )
);
Badge.displayName = 'Badge';

// Export all components
export {
  Stat,
  StatGroup,
  StyledLabel,
  FeatureItem,
  FeatureList,
  InfoNote,
  Badge,
  PageBadge,
  TemplatePageHeader,
  FeaturesCard,
  MetricCard,
  FeatureCard,
};
