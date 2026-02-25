'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Square } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      // WCAG 2.1 AA: h-12 ensures adequate touch target on mobile
      'flex h-12 cursor-default items-center px-2 text-xs transition-colors select-none focus-visible:outline-none sm:h-auto sm:py-2',
      'hover:bg-accent hover:text-accent-foreground',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
      mode.radius,
      mode.font,
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-dropdown overflow-hidden border p-2',
      mode.color.bg.elevated,
      mode.color.text.primary,
      mode.color.border.default,
      mode.radius,
      mode.font,
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

/**
 * DropdownMenuContent displays actions in a dropdown menu.
 *
 * **ALIGNMENT GUIDE:**
 * The `align` prop controls horizontal alignment relative to the trigger button.
 * Choose alignment based on trigger position to prevent content overflow at screen edges.
 *
 * @param {string} align - Controls horizontal alignment relative to trigger
 *   - `"end"` - Right-aligned (for right-side triggers: table actions, navbar menus, card actions)
 *   - `"start"` - Left-aligned (for left-side triggers: sidebar menus, left-positioned actions)
 *   - `"center"` - Centered (rare, only for centered triggers)
 *   - Default (omit) - Auto-aligned based on available space
 *
 * @param {number} sideOffset - Space between trigger and content (default: 4px)
 *
 * @example
 * // Table action menu (right-aligned to prevent overflow)
 * <DropdownMenuContent align="end" className="w-48">
 *   <DropdownMenuLabel>Actions</DropdownMenuLabel>
 *   <DropdownMenuSeparator />
 *   <DropdownMenuItem className="font-semibold">
 *     <UserCog className="mr-2 h-4 w-4" />
 *     Edit User
 *   </DropdownMenuItem>
 *   <DropdownMenuItem className="text-destructive font-semibold">
 *     <Trash2 className="mr-2 h-4 w-4" />
 *     Delete
 *   </DropdownMenuItem>
 * </DropdownMenuContent>
 *
 * @example
 * // Sidebar menu (left-aligned)
 * <DropdownMenuContent align="start" className="w-56">
 *   <DropdownMenuItem className="font-semibold">
 *     <Settings className="mr-2 h-4 w-4" />
 *     Settings
 *   </DropdownMenuItem>
 * </DropdownMenuContent>
 *
 * @see {@link /docs/DROPDOWN-ALIGNMENT-GUIDE.md} for comprehensive alignment guide
 */
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      data-slot="dropdown-menu-content"
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-dropdown overflow-hidden border p-2',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        mode.color.bg.elevated,
        mode.color.text.primary,
        mode.color.border.default,
        mode.radius,
        mode.font,
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

/**
 * DropdownMenuItem represents an actionable item within a dropdown menu.
 *
 * **ICON & SPACING STANDARDS:**
 * - Icons: Use `h-4 w-4` (16px) size
 * - Spacing: Add `mr-2` (8px gap) between icon and text
 * - Font weight: Add `font-semibold` for emphasized menu items
 * - Destructive actions: Use `text-destructive` className
 *
 * @param {boolean} inset - Adds left padding for alignment with items that have indicators
 *
 * @example
 * // Standard menu item with icon
 * <DropdownMenuItem className="font-semibold">
 *   <Settings className="mr-2 h-4 w-4" />
 *   Settings
 * </DropdownMenuItem>
 *
 * @example
 * // Destructive action (delete, remove, etc.)
 * <DropdownMenuItem className="text-destructive font-semibold">
 *   <Trash2 className="mr-2 h-4 w-4" />
 *   Delete Item
 * </DropdownMenuItem>
 *
 * @example
 * // With long text (uses truncation)
 * <DropdownMenuItem className="font-semibold">
 *   <FileText className="mr-2 h-4 w-4" />
 *   <span className="flex-1 truncate">
 *     Very long menu item text that will be truncated
 *   </span>
 * </DropdownMenuItem>
 */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    data-slot="dropdown-menu-item"
    className={cn(
      // WCAG 2.1 AA: h-12 ensures adequate touch target on mobile (accounts for subpixel rendering)
      'relative flex h-12 cursor-default items-center px-2 text-xs transition-colors select-none focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 sm:h-auto sm:py-2',
      'hover:bg-accent hover:text-accent-foreground',
      'focus:bg-accent focus:text-accent-foreground',
      mode.radius,
      mode.font,
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      // WCAG 2.1 AA: h-12 ensures adequate touch target on mobile
      'relative flex h-12 cursor-default items-center pr-2 pl-8 text-xs transition-colors select-none focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 sm:h-auto sm:py-2',
      'hover:bg-accent hover:text-accent-foreground',
      'focus:bg-accent focus:text-accent-foreground',
      mode.radius,
      mode.font,
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      // WCAG 2.1 AA: h-12 ensures adequate touch target on mobile
      'relative flex h-12 cursor-default items-center pr-2 pl-8 text-xs transition-colors select-none focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 sm:h-auto sm:py-2',
      'hover:bg-accent hover:text-accent-foreground',
      'focus:bg-accent focus:text-accent-foreground',
      mode.radius,
      mode.font,
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Square className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-2 text-xs font-semibold', mode.font, inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px', mode.color.bg.muted, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest', mode.color.text.muted, mode.font, className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
