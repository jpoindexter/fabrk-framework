/**
 * ✅ FABRK COMPONENT
 * Button component with variants and states.
 * Uses Visual Mode System for aesthetic switching.
 *
 * Design System Integration:
 * - Imports from @/design-system for static mode (server components)
 * - Radius, font, and text transform from visual mode config
 * - Follows 8-point grid spacing system
 *
 * @example
 * ```tsx
 * <Button variant="default" size="md">> SUBMIT</Button>
 * ```
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

/**
 * Button Variants using Design System Tokens
 *
 * Color tokens:
 * - bg-primary, text-primary-foreground → Primary action
 * - bg-destructive, text-destructive-foreground → Destructive action
 * - bg-secondary, text-secondary-foreground → Secondary action
 * - bg-background, text-foreground → Ghost/outline
 *
 * State tokens:
 * - --state-disabled-opacity: 0.38 → WCAG-compliant disabled state
 * - --state-hover-opacity: 0.08 → Hover overlay
 * - --state-active-opacity: 0.12 → Active/pressed overlay
 *
 * Spacing (8-point grid):
 * - px-4 (16px), py-2 (8px) → Default
 * - px-2 (8px) → Small
 * - px-6 (24px) → Large
 * - px-8 (32px) → Extra large
 */
const buttonVariants = cva(
  // Base styles - uses mode tokens for consistent theming
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors',
    'focus-visible:outline-none',
    mode.state.focus.ring,
    mode.state.disabled.opacity,
    mode.state.disabled.cursor,
    mode.typography.button,
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
  ),
  {
    variants: {
      variant: {
        // Primary - uses mode color tokens
        default: cn(
          mode.color.bg.accent,
          mode.color.text.inverse,
          mode.state.hover.bg,
          'crt-scanlines crt-glow'
        ),
        // Destructive - uses mode danger tokens
        destructive: cn(
          mode.color.bg.danger,
          mode.color.text.inverse,
          'hover:bg-destructive/90 crt-scanlines'
        ),
        // Outline - uses mode border and background tokens
        outline: cn(
          mode.color.border.default,
          mode.color.bg.base,
          'border hover:bg-muted',
          mode.color.border.accent,
          'hover:bg-muted/50'
        ),
        // Secondary - uses mode secondary tokens
        secondary: cn(mode.color.bg.secondary, 'text-secondary-foreground hover:bg-secondary/80 crt-scanlines'),
        // Ghost - uses mode text tokens
        ghost: cn(mode.color.text.primary, 'hover:bg-foreground/10'),
        // Link - uses mode accent text
        link: cn(mode.color.text.accent, 'underline-offset-4 hover:underline'),
        // CTA variants - larger padding for marketing + mode tokens
        primaryCta: cn(
          mode.color.bg.accent,
          mode.color.text.inverse,
          mode.state.hover.bg,
          mode.spacing.button.lg,
          'crt-scanlines crt-glow'
        ),
        secondaryCta: cn(
          mode.color.bg.secondary,
          'text-secondary-foreground hover:bg-secondary/80',
          mode.spacing.button.lg,
          'crt-scanlines'
        ),
        ghostOnDark: cn(
          'border border-foreground/30 bg-transparent',
          mode.color.text.primary,
          'hover:bg-foreground/10',
          mode.spacing.button.lg,
          'crt-scanlines'
        ),
      },
      size: {
        // WCAG 2.1 AA: min-h-touch (44px) ensures adequate touch target on mobile
        // Uses mode spacing tokens for consistent sizing
        default: cn('min-h-touch sm:min-h-0 sm:h-8', mode.spacing.button.md),
        sm: cn('min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 sm:h-8', mode.spacing.button.sm),
        lg: cn('min-h-touch sm:min-h-0 sm:h-10', mode.spacing.button.lg),
        xl: cn('min-h-touch text-sm sm:min-h-0 sm:h-12', 'px-8'),
        icon: 'min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 sm:h-10 sm:w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText = '> LOADING...',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // UX Heuristic #1: Visibility of System Status
    // Visual Mode System: Apply radius, font, and text transform from mode config
    return (
      <Comp
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size }),
          mode.radius,
          mode.textTransform === 'uppercase' && 'uppercase',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        aria-label={loading ? loadingText : undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
