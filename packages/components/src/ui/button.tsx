import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

const buttonVariants = cva(
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
        default: cn(
          mode.color.bg.accent,
          mode.color.text.inverse,
          mode.state.hover.bg,
          'crt-scanlines crt-glow'
        ),
        destructive: cn(
          mode.color.bg.danger,
          mode.color.text.inverse,
          'hover:bg-destructive/90 crt-scanlines'
        ),
        outline: cn(
          mode.color.border.default,
          mode.color.bg.base,
          'border hover:bg-muted',
          mode.color.border.accent,
          'hover:bg-muted/50'
        ),
        secondary: cn(mode.color.bg.secondary, 'text-secondary-foreground hover:bg-secondary/80 crt-scanlines'),
        ghost: cn(mode.color.text.primary, 'hover:bg-foreground/10'),
        link: cn(mode.color.text.accent, 'underline-offset-4 hover:underline'),
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
