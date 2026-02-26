# DESIGN SYSTEM RULES

Rules that every component in `@fabrk/components` must follow. These rules keep themes working correctly and maintain the terminal aesthetic across the entire system.

---

## The `mode` Object

The `mode` object is the single source of truth for all visual design tokens. It lives in `@fabrk/design-system` and maps semantic token names to Tailwind classes. It is runtime-stable (not dynamic per-request) but allows future theme switching by changing what `mode` resolves to.

**Import:**
```tsx
import { mode } from '@fabrk/design-system'
```

**Never** import design tokens from component-local files, hardcode Tailwind color classes, or reference `@/design-system` (that path alias is fabrk-dev only).

---

### `mode.radius`

Dynamic border-radius class. Currently resolves to the terminal theme value (sharp/square corners).

```tsx
mode.radius  // e.g. "rounded-none" in terminal theme
```

**Rule:** Add `mode.radius` to every element that has a **full border** (`border`, `border-2`). See the Border Rules section below.

---

### `mode.font`

Monospace font class for the terminal aesthetic.

```tsx
mode.font  // e.g. "font-mono"
```

**Rule:** Apply to all text that should read as terminal output — labels, button text, badge text, card headers, code output. Do not apply to prose body text where normal reading rhythm is expected.

---

### `mode.textTransform`

Text casing mode. Always `'uppercase'` in the terminal theme.

```tsx
mode.textTransform  // 'uppercase'
```

Used indirectly — the Button component applies it via CSS. Do not add `uppercase` manually to buttons; it will be applied twice.

---

### `mode.color.bg.*`

Background color Tailwind classes using semantic tokens.

| Property | Tailwind class | Intended use |
|---|---|---|
| `mode.color.bg.base` | `bg-background` | Page/root background |
| `mode.color.bg.surface` | `bg-card` | Card surfaces |
| `mode.color.bg.surfaceRaised` | `bg-card` | Raised card variant |
| `mode.color.bg.elevated` | `bg-popover` | Dropdowns, popovers |
| `mode.color.bg.accent` | `bg-accent` | Primary CTA backgrounds |
| `mode.color.bg.accentMuted` | `bg-accent/10` | Accent tints |
| `mode.color.bg.primaryLight` | `bg-primary/10` | Light primary tint |
| `mode.color.bg.danger` | `bg-destructive` | Error/destructive backgrounds |
| `mode.color.bg.dangerMuted` | `bg-destructive/10` | Error tint |
| `mode.color.bg.success` | `bg-success` | Success state background |
| `mode.color.bg.successMuted` | `bg-success/10` | Success tint |
| `mode.color.bg.warning` | `bg-warning` | Warning background |
| `mode.color.bg.warningMuted` | `bg-warning/10` | Warning tint |
| `mode.color.bg.infoMuted` | `bg-info/10` | Info tint |
| `mode.color.bg.muted` | `bg-muted` | Muted/secondary backgrounds |
| `mode.color.bg.secondary` | `bg-secondary` | Secondary action backgrounds |

---

### `mode.color.text.*`

Text color Tailwind classes.

| Property | Tailwind class | Intended use |
|---|---|---|
| `mode.color.text.primary` | `text-foreground` | Main body text |
| `mode.color.text.secondary` | `text-card-foreground` | Secondary text on cards |
| `mode.color.text.muted` | `text-muted-foreground` | Subdued/placeholder text |
| `mode.color.text.inverse` | `text-accent-foreground` | Text on accent backgrounds |
| `mode.color.text.accent` | `text-accent` | Links and emphasis |
| `mode.color.text.danger` | `text-destructive` | Error text |
| `mode.color.text.dangerOnColor` | `text-destructive-foreground` | Text on destructive bg |
| `mode.color.text.success` | `text-success` | Success text |
| `mode.color.text.successOnColor` | `text-success-foreground` | Text on success bg |
| `mode.color.text.warning` | `text-warning` | Warning text |
| `mode.color.text.warningOnColor` | `text-warning-foreground` | Text on warning bg |
| `mode.color.text.info` | `text-info` | Info text |

---

### `mode.color.border.*`

Border color Tailwind classes.

| Property | Tailwind class | Intended use |
|---|---|---|
| `mode.color.border.default` | `border-border` | Standard border |
| `mode.color.border.accent` | `border-primary` | Accent/highlighted border |
| `mode.color.border.danger` | `border-destructive` | Error state border |
| `mode.color.border.success` | `border-success` | Success state border |
| `mode.color.border.warning` | `border-warning` | Warning state border |

---

### `mode.state.*`

Interactive state classes.

**Hover states (`mode.state.hover.*`):**

| Property | Value | Use |
|---|---|---|
| `mode.state.hover.bg` | `hover:bg-primary/90` | Button hover background |
| `mode.state.hover.text` | `hover:text-foreground` | Text hover |
| `mode.state.hover.card` | `hover:bg-muted/50` | Card hover |
| `mode.state.hover.opacity` | `hover:opacity-90` | Generic opacity hover |

**Focus state (`mode.state.focus.ring`):**

```tsx
mode.state.focus.ring
// "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
```

Always apply to interactive elements (buttons, inputs, links) for WCAG 2.4.7 compliance.

**Disabled states:**

| Property | Value |
|---|---|
| `mode.state.disabled.opacity` | `disabled:opacity-50` |
| `mode.state.disabled.cursor` | `disabled:cursor-not-allowed` |

**Opacity utility states:**

| Property | Value | Use |
|---|---|---|
| `mode.state.muted.opacity` | `opacity-50` | Muted elements |
| `mode.state.subtle.opacity` | `opacity-40` | Subtle/secondary elements |
| `mode.state.secondary.opacity` | `opacity-70` | Secondary importance |

---

### `mode.typography.*`

Typography tokens for UI components. Use these instead of arbitrary `text-*` sizes.

| Property | Value | Use |
|---|---|---|
| `mode.typography.body.m` | `text-body-m` | 14px body text |
| `mode.typography.button` | `text-label-m font-medium` | Button labels |
| `mode.typography.caption` | `text-caption text-muted-foreground` | Helper/caption text |
| `mode.typography.input` | `text-body-m` | Input field text |
| `mode.typography.label` | `text-label-m` | UI labels |

For larger headings, use Tailwind classes directly: `text-headline-l`, `text-title-l`, etc. These are custom type-scale classes defined in the design system but are not exposed through `mode.typography`.

---

### `mode.spacing.*`

Padding token classes aligned to the 8-point grid.

| Property | Value | Use |
|---|---|---|
| `mode.spacing.button.sm` | `px-2 py-1` | Small button padding |
| `mode.spacing.button.md` | `px-4 py-2` | Default button padding |
| `mode.spacing.button.lg` | `px-6 py-4` | Large/CTA button padding |
| `mode.spacing.input` | `px-4 py-2` | Input padding |
| `mode.spacing.card` | `p-4` | Card content padding |
| `mode.spacing.badge.sm` | `px-2 py-0.5` | Small badge padding |
| `mode.spacing.badge.md` | `px-2 py-1` | Default badge padding |

---

## Critical Border Rules

### ALWAYS add `mode.radius` to full borders

When an element has a full border (`border`, `border-2`), it must also receive `mode.radius`. This allows the design system to control corner shape globally.

```tsx
// Correct
<div className={cn("border border-border", mode.radius)}>
<Card className={cn("border", mode.radius)}>
<button className={cn("border-2 border-primary", mode.radius)}>
```

### NEVER add `mode.radius` to partial borders

Partial borders only apply to one side. Adding radius to them causes unintended corner rounding on all corners, which breaks layouts.

```tsx
// Correct — no mode.radius
<div className="border-t border-border">
<div className="border-b border-border">
<div className="border-l border-border">
<div className="border-r border-border">
```

### NEVER add `mode.radius` to table cells

Table cells (`<th>`, `<td>`) share borders with adjacent cells. Border-radius breaks the grid layout and creates visual gaps.

```tsx
// Correct — no mode.radius on table cells
<th className="border-b border-border px-4 py-2">
<td className="border-b border-border px-4 py-2">

// Apply mode.radius to the table wrapper instead if needed
<div className={cn("border border-border overflow-hidden", mode.radius)}>
  <table>...</table>
</div>
```

### ALWAYS use `rounded-full` for switches and toggles

Switches are pill-shaped by design convention and should never respect `mode.radius` because their shape is an affordance that communicates binary state.

```tsx
// Correct — hardcoded pill shape
<button
  role="switch"
  className={cn(
    "inline-flex h-6 w-11 items-center rounded-full border-2",
    checked ? "bg-primary" : "bg-muted"
  )}
>
  <span className={cn("block h-4 w-4 rounded-full bg-white transition-transform", ...)}>
```

---

## Design Token Rules

### ALWAYS use semantic tokens

Semantic tokens survive theme changes. Hardcoded Tailwind color classes do not.

```tsx
// Correct
className="bg-primary text-primary-foreground"
className="bg-card border-border"
className="text-muted-foreground"
className="bg-destructive text-destructive-foreground"
```

### NEVER use hardcoded colors

Hardcoded Tailwind color scale classes (`blue-500`, `gray-100`, etc.) break every theme except the one they were designed for.

```tsx
// Wrong — these break theme switching
className="bg-blue-500 text-white"
className="bg-gray-100 text-gray-800"
className="border-slate-300"
```

### NEVER use inline oklch or rgb colors

Do not write `style={{ color: 'oklch(...)' }}` or `style={{ backgroundColor: 'rgb(...)' }}`. All colors must come from CSS variables via Tailwind semantic tokens.

### Allowed token list

**Backgrounds:** `bg-background`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`, `bg-success`, `bg-warning`, `bg-info`, and opacity variants of these.

**Text:** `text-foreground`, `text-card-foreground`, `text-popover-foreground`, `text-primary-foreground`, `text-secondary-foreground`, `text-muted-foreground`, `text-accent-foreground`, `text-destructive-foreground`, `text-success`, `text-success-foreground`, `text-warning`, `text-warning-foreground`, `text-info`, `text-info-foreground`.

**Borders:** `border-border`, `border-input`, `border-ring`, `border-primary`, `border-destructive`, `border-success`, `border-warning`.

**Chart colors:** `hsl(var(--chart-1))` through `hsl(var(--chart-6))` — accessed through the chart CSS variables, not Tailwind classes.

---

## Terminal Text Casing

This framework uses terminal aesthetic text conventions throughout all UI.

### UI Labels and Badges — UPPERCASE

All badge text, status labels, category tags, and UI identifiers are uppercase. Use bracket notation for system labels.

```tsx
// Correct
<Badge>[SYSTEM]</Badge>
<Badge>[STATUS]</Badge>
<span>[API KEY CREATED]</span>
<span>[USER]</span>
```

### Buttons — UPPERCASE with `>` prefix

All button text is uppercase and prefixed with `> ` to evoke a terminal prompt. The Button component applies `uppercase` via CSS automatically; the `>` prefix is added to the text content.

```tsx
// Correct
<Button>> SUBMIT</Button>
<Button>> CANCEL</Button>
<Button>> ENABLE 2FA</Button>
<Button loading loadingText="> LOADING..."> SAVE CHANGES</Button>
```

The Button component itself handles `uppercase` via `mode.textTransform`. Do not add the class manually; it will be applied twice.

### Headlines (H1, H2) — UPPERCASE

Page-level headings are uppercase.

```tsx
// Correct
<h1 className={cn("text-headline-l font-bold uppercase", mode.font)}>
  WELCOME TO YOUR DASHBOARD
</h1>
<h2 className={cn("text-title-l font-semibold uppercase", mode.font)}>
  RECENT ACTIVITY
</h2>
```

### Body text — Normal sentence case

Running prose text uses normal sentence case. Uppercase is reserved for UI chrome.

```tsx
// Correct
<p>Get started by connecting your first repository.</p>
<p>Your account has been updated successfully.</p>
```

### NEVER use underscores in user-facing text

Use spaces. Underscores are for code identifiers only.

```tsx
// Wrong
<span>API_KEY_CREATED</span>
<span>TWO_FACTOR_AUTH</span>

// Correct
<span>[API KEY CREATED]</span>
<span>[TWO FACTOR AUTH]</span>
```

---

## Component Pattern Rules

### Always use `cn()` from `@fabrk/core`

```tsx
import { cn } from '@fabrk/core'

// Correct
<div className={cn("flex items-center", mode.font, className)}>
```

Do not import `cn` from `clsx`, `tailwind-merge`, or any other package. The `@fabrk/core` version is the canonical utility.

### Always forward refs

Interactive elements (buttons, inputs, form fields) must forward refs so consumers can wire up focus management and form libraries.

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants(), className)} {...props} />
  )
)
Button.displayName = 'Button'
```

### Always accept `className`

Every component must accept a `className` prop and merge it last in `cn()` so consumers can override.

```tsx
export interface MyComponentProps {
  className?: string
}

export function MyComponent({ className }: MyComponentProps) {
  return <div className={cn("default-classes", className)} />
}
```

### Components are always `"use client"` compatible

The `@fabrk/components` package uses a tsup banner to prepend `"use client"` to all output. All components can be used in Next.js App Router without explicit `"use client"` declarations in the component files themselves.

### Use callback props, not direct API calls

Components accept callbacks for all side effects. They do not call APIs, make fetch requests, or import server-side utilities.

```tsx
// Correct — callback pattern
<MfaCard
  twoFactorEnabled={user.mfaEnabled}
  onEnable2FA={() => startMfaSetup()}
  onDisable2FA={() => disableMfa()}
/>

// Wrong — component makes its own API call
<MfaCard userId={user.id} />  // Don't do this
```

---

## Anti-Patterns

### Template literal interpolation in `cn()` breaks Tailwind JIT

Tailwind's JIT scanner looks for complete class strings at build time. When you interpolate a variable inside a template literal within `cn()`, the scanner cannot detect the class.

```tsx
// WRONG — Tailwind JIT cannot detect `border-border` at build time
<div className={cn(`border ${mode.color.border.default}`, mode.radius)}>

// Correct — pass as separate argument
<div className={cn("border", mode.color.border.default, mode.radius)}>
```

### Template literal interpolation in CVA variant strings

Same issue applies inside CVA variant definitions. Pre-compute variant classes as constants outside the CVA call.

```tsx
// WRONG — JIT cannot scan these
const variants = cva('base', {
  variants: {
    state: {
      active: `${mode.color.bg.accent} ${mode.color.text.inverse}`,
    }
  }
})

// Correct — use cn() inside variant values or pre-compute
const ACTIVE_CLASSES = cn(mode.color.bg.accent, mode.color.text.inverse)

const variants = cva('base', {
  variants: {
    state: {
      active: ACTIVE_CLASSES,
    }
  }
})
```

### Using `style={{ display: 'none' }}` for hiding elements

Use Tailwind's `hidden` class instead. Inline styles bypass the design system and can conflict with CSS specificity.

```tsx
// Wrong
<div style={{ display: 'none' }}>

// Correct
<div className="hidden">

// For conditional visibility
<div className={cn(isVisible ? 'block' : 'hidden')}>
```

### Importing from `@fabrk/design-system` for component-level tokens

Never import raw theme primitives or the `terminalClasses` object directly. Always use `mode`.

```tsx
// Wrong — bypasses the mode abstraction layer
import { terminalClasses } from '@fabrk/design-system'

// Correct
import { mode } from '@fabrk/design-system'
```

### Spreading unknown props onto DOM elements without filtering

When a component accepts arbitrary HTML attributes, ensure they are spread onto the correct DOM element and that custom props (like `loading`, `asChild`) are destructured out before spreading.

```tsx
// Correct — loading is consumed, not spread to DOM
const Button = ({ loading, ...props }) => (
  <button {...props} disabled={loading || props.disabled} />
)
```

---

## Theme Utility Functions

These functions are exported from `@fabrk/design-system` for formatting text to match the terminal aesthetic.

```tsx
import {
  formatButtonText,  // Prepends "> " and uppercases
  formatLabelText,   // Wraps in brackets and uppercases: "[LABEL]"
  formatCardHeader,  // "[CODE] TITLE" format
  formatStatusText,  // Uppercases status strings
} from '@fabrk/design-system'

// Usage
formatButtonText('submit')      // "> SUBMIT"
formatLabelText('system')       // "[SYSTEM]"
formatCardHeader('Users', '0x01')  // "[0x01] USERS"
formatStatusText('active')      // "ACTIVE"
```

These functions are preferred over manual string formatting when building new components to ensure consistent output.
