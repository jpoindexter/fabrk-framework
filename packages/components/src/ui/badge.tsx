import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

// Pre-compute static class strings so Tailwind JIT can scan them
const badgeVariantDefault = [mode.color.bg.accent, mode.color.text.inverse, mode.color.border.accent, 'hover:bg-accent/90'].join(' ');
const badgeVariantSecondary = [mode.color.bg.secondary, 'text-secondary-foreground', mode.color.border.default, 'hover:bg-secondary/90'].join(' ');
const badgeVariantAccent = [mode.color.bg.accent, mode.color.text.inverse, mode.color.border.accent, 'hover:bg-accent/90'].join(' ');
const badgeVariantDestructive = [mode.color.bg.danger, mode.color.text.dangerOnColor, mode.color.border.danger, 'hover:bg-destructive/90'].join(' ');
const badgeVariantNeutral = [mode.color.bg.base, mode.color.text.primary, mode.color.border.default, 'hover:bg-muted'].join(' ');
const badgeVariantOutline = ['bg-transparent', mode.color.border.default, mode.color.text.primary, 'hover:text-foreground/10'].join(' ');

const badgeVariants = cva(
  'inline-flex items-center justify-center border w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none transition-colors gap-2',
  {
    variants: {
      variant: {
        default: badgeVariantDefault,
        secondary: badgeVariantSecondary,
        accent: badgeVariantAccent,
        destructive: badgeVariantDestructive,
        neutral: badgeVariantNeutral,
        outline: badgeVariantOutline,
      },
      size: {
        sm: 'px-2 py-0.5 text-xs font-medium [&>svg]:size-3',
        md: 'px-2 py-1 text-xs font-medium [&>svg]:size-3',
        lg: 'px-4 py-2 text-xs font-semibold [&>svg]:size-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant, size }),
        mode.radius,
        mode.font,
        mode.textTransform === 'uppercase' && 'uppercase',
        'crt-scanlines',
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
