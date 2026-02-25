'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

export type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-slot="select-trigger"
    className={cn(
      'flex h-12 w-full items-center justify-between border px-4 transition-colors focus-visible:outline-none sm:h-8 [&>span]:line-clamp-1',
      mode.color.bg.base,
      mode.color.text.primary,
      mode.color.text.muted.replace('text-', 'placeholder:text-'),
      mode.color.border.default,
      mode.typography.input,
      mode.state.focus.ring,
      mode.state.disabled.cursor,
      mode.state.disabled.opacity,
      mode.radius,
      mode.font,
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className={cn('size-4', mode.state.muted.opacity)} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>;

/**
 * SelectContent displays the dropdown options for a Select component.
 *
 * **ALIGNMENT BEHAVIOR:**
 * Select components align automatically to match the trigger width and position.
 * Unlike DropdownMenu, you should NOT specify an `align` prop on SelectContent.
 * The component automatically handles positioning to prevent overflow.
 *
 * **USAGE:**
 * - Form inputs: Default positioning (automatic alignment)
 * - Pagination: Use compact width like `w-[70px]` on SelectTrigger
 * - Filters: Standard width, let content match trigger
 *
 * @param {string} position - Portal positioning strategy (default: "popper")
 *   - "popper" - Dynamic positioning with collision detection
 *   - "item-aligned" - Aligns selected item with trigger
 *
 * @example
 * // Standard form select
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select role" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="admin">Admin</SelectItem>
 *     <SelectItem value="member">Member</SelectItem>
 *   </SelectContent>
 * </Select>
 *
 * @example
 * // Compact pagination select
 * <Select>
 *   <SelectTrigger className="h-8 w-[70px] font-semibold">
 *     <SelectValue />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="10" className="font-semibold">10</SelectItem>
 *     <SelectItem value="20" className="font-semibold">20</SelectItem>
 *     <SelectItem value="50" className="font-semibold">50</SelectItem>
 *   </SelectContent>
 * </Select>
 */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      data-slot="select-content"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-32 overflow-hidden border',
        mode.color.bg.elevated,
        mode.color.text.primary,
        mode.color.border.default,
        mode.radius,
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-2',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>;

/**
 * SelectItem represents an option within a Select dropdown.
 *
 * **FONT WEIGHT PATTERNS:**
 * - Default: Use default font weight (no className needed)
 * - Emphasized contexts: Add `font-semibold` for data-heavy interfaces
 *   - Pagination selects (rows per page)
 *   - Admin panels and filters
 *   - Dashboard controls
 *
 * **STYLING:**
 * - Automatically displays checkmark icon when selected
 * - Supports disabled state via `disabled` prop
 * - Truncates long text automatically
 *
 * @example
 * // Standard form select item
 * <SelectItem value="option1">Option 1</SelectItem>
 *
 * @example
 * // Emphasized select item (pagination, admin panels)
 * <SelectItem value="10" className="font-semibold">
 *   10 rows
 * </SelectItem>
 *
 * @example
 * // Disabled option
 * <SelectItem value="disabled" disabled>
 *   Unavailable Option
 * </SelectItem>
 */
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    data-slot="select-item"
    className={cn(
      'relative flex h-12 w-full cursor-default items-center pr-2 pl-8 select-none focus-visible:outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 sm:h-auto sm:py-2',
      mode.typography.input,
      mode.radius,
      mode.font,
      mode.state.hover.card,
      'focus:bg-muted/50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

export type SelectLabelProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-2 pr-2 pl-8 font-medium', mode.typography.caption, mode.font, className)}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

export type SelectSeparatorProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(mode.color.bg.muted, '-mx-1 my-1 h-px', className)}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
