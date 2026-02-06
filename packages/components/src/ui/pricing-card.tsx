/**
 * PricingCard - Reusable terminal-style pricing display component
 * Used for checkout flows, landing pages, and pricing displays
 */
'use client';

import { Terminal } from 'lucide-react';
import { Card, CardContent } from './card';
import { mode } from '@fabrk/design-system';
import { cn } from '../lib/utils';

export interface PricingCardProps {
  /** Main price to display (e.g., "$199") */
  price: string;
  /** Original/crossed-out price (e.g., "$299") */
  regularPrice?: string;
  /** Discount message (e.g., "SAVE $100 Instantly!") */
  discountMessage?: string;
  /** Header title (e.g., "ONE-TIME LIFETIME ACCESS") */
  title?: string;
  /** Urgency text with pulse animation (e.g., "OFFER ENDS SOON!") */
  urgencyMessage?: string;
  /** Subtext below price (e.g., "ONE TIME PAYMENT") */
  priceSubtext?: string;
  /** Highlight badges (e.g., ["NO SUBSCRIPTION", "UNLIMITED PROJECTS"]) */
  highlights?: string[];
  /** Trust/guarantee line at bottom */
  trustLine?: string;
  /** Header code identifier */
  headerCode?: string;
  /** CTA button - render any button/checkout component */
  children?: React.ReactNode;
  /** Additional className for the card wrapper */
  className?: string;
}

export function PricingCard({
  price,
  regularPrice,
  discountMessage,
  title = 'ONE-TIME LIFETIME ACCESS',
  urgencyMessage,
  priceSubtext = 'ONE TIME PAYMENT',
  highlights = [],
  trustLine,
  headerCode = '0x41',
  children,
  className,
}: PricingCardProps) {
  return (
    <Card size="auto" className={cn('w-full max-w-sm', className)}>
      {/* Custom Header with Terminal Icon */}
      <div className={cn(mode.color.border.default, 'bg-card flex h-11 items-center justify-between border-b px-4')}>
        <span className={cn('text-muted-foreground text-xs tracking-wide', mode.font)}>
          [{headerCode}] PRICING_CONFIG
        </span>
        <Terminal className="text-primary h-5 w-5 animate-pulse" />
      </div>

      <CardContent padding="md" className="flex flex-col items-center text-center">
        {/* Title */}
        <h3 className={cn('text-foreground text-sm font-bold uppercase tracking-wide', mode.font)}>
          {title}
        </h3>

        {/* Urgency Message */}
        {urgencyMessage && (
          <p className={cn('text-primary mt-2 animate-pulse text-sm font-bold uppercase', mode.font)}>
            {urgencyMessage}
          </p>
        )}

        {/* Price Display */}
        <div className="mt-6 flex w-full flex-col items-center py-4">
          {regularPrice && (
            <p className={cn('text-muted-foreground text-xs font-bold line-through', mode.font)}>
              {regularPrice}
            </p>
          )}
          <p className={cn('text-primary text-7xl font-bold leading-none lg:text-8xl', mode.font)}>
            {price}
          </p>
          {discountMessage && (
            <p className={cn('text-primary mt-1 text-sm font-bold uppercase', mode.font)}>
              {discountMessage}
            </p>
          )}
          <p
            className={cn(
              'text-muted-foreground mt-3 text-xs uppercase tracking-wider',
              mode.font
            )}
          >
            {priceSubtext}
          </p>
        </div>

        {/* CTA Button (passed as children) */}
        {children && <div className="mt-6 w-full">{children}</div>}

        {/* Highlight Badges */}
        {highlights.length > 0 && (
          <div className="mt-6 flex w-full flex-wrap justify-center gap-x-4 gap-y-2">
            {highlights.map((item) => (
              <p
                key={item}
                className={cn('text-primary text-xs font-bold uppercase tracking-wider', mode.font)}
              >
                ✓ {item}
              </p>
            ))}
          </div>
        )}

        {/* Trust line */}
        {trustLine && (
          <p className={cn('text-muted-foreground mt-4 text-center text-xs', mode.font)}>
            {trustLine}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
