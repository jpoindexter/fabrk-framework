/**
 * ✅ FABRK COMPONENT
 * Add icons, buttons, and more to your inputs.
 *
 * @example
 * ```tsx
 * <input-group size="md" />
 * ```
 */

'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { Textarea } from './textarea';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export type InputGroupProps = React.ComponentProps<'div'> & {
  size?: 'sm' | 'md' | 'lg';
};
export type InputGroupAddonProps = React.ComponentProps<'div'> &
  VariantProps<typeof inputGroupAddonVariants>;
export type InputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>;
export type InputGroupTextProps = React.ComponentProps<'span'> & {
  asChild?: boolean;
};
export type InputGroupInputProps = React.ComponentProps<'input'>;
export type InputGroupTextareaProps = React.ComponentProps<'textarea'>;
export type InputGroupSeparatorProps = React.ComponentProps<typeof Separator>;

function InputGroup({ className, size, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      data-size={size}
      role="group"
      className={cn(
        'group/input-group border-input relative flex w-full items-center border transition-[color,box-shadow] focus-visible:outline-none',
        mode.radius,
        'h-9 has-[>textarea]:h-auto',

        // Variants based on alignment.
        'has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-4',
        'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-4',

        // Focus state.
        'has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1',

        // Error state.
        `has-[[data-slot][aria-invalid=true]]:${mode.color.border.danger} has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40`,

        className
      )}
      {...props}
    />
  );
}
InputGroup.displayName = 'InputGroup';

const inputGroupAddonVariants = cva(
  cn(
    "flex h-auto cursor-text select-none items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-4",
    mode.font,
    `[&>kbd]:${mode.radius}`
  ),
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-4 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
        'inline-end': 'order-last pr-4 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
        'block-start':
          '[.border-b]:pb-4 order-first w-full justify-start px-4 pt-4 group-has-[>input]/input-group:pt-2.5',
        'block-end':
          '[.border-t]:pt-4 order-last w-full justify-start px-4 pb-4 group-has-[>input]/input-group:pb-2.5',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  }
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          e.currentTarget.parentElement?.querySelector('input')?.focus();
        }
      }}
      {...props}
    />
  );
}
InputGroupAddon.displayName = 'InputGroupAddon';

const inputGroupButtonVariants = cva(cn('flex items-center gap-2 text-xs shadow-none', mode.font), {
  variants: {
    size: {
      xs: cn("h-6 gap-1 px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5", mode.radius),
      sm: cn('h-8 gap-2 px-2.5 has-[>svg]:px-2.5', mode.radius),
      // Industry standard: Minimal padding p-1 for icon buttons
      'icon-xs': cn('size-6 p-1 has-[>svg]:p-1', mode.radius),
      'icon-sm': cn('size-8 p-1 has-[>svg]:p-1', mode.radius),
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}
InputGroupButton.displayName = 'InputGroupButton';

function InputGroupText({ className, asChild = false, ...props }: InputGroupTextProps) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
      data-slot="input-group-text"
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        mode.font,
        className
      )}
      {...props}
    />
  );
}
InputGroupText.displayName = 'InputGroupText';

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0',
        mode.radius,
        className
      )}
      {...props}
    />
  );
}
InputGroupInput.displayName = 'InputGroupInput';

function InputGroupTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none border-0 bg-transparent py-4 shadow-none focus-visible:ring-0',
        mode.radius,
        className
      )}
      {...props}
    />
  );
}
InputGroupTextarea.displayName = 'InputGroupTextarea';

function InputGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: InputGroupSeparatorProps) {
  return (
    <Separator
      data-slot="input-group-separator"
      orientation={orientation}
      className={cn(
        'bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto',
        className
      )}
      {...props}
    />
  );
}
InputGroupSeparator.displayName = 'InputGroupSeparator';

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupSeparator,
  InputGroupText,
  InputGroupTextarea,
};
