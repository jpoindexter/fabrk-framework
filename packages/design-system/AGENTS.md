# @fabrk/design-system — Agent Reference

Token-driven, terminal-aesthetic design system. The `mode` object is what you use in components.

```ts
import { mode } from '@fabrk/design-system'
import { ThemeProvider, ThemeScript } from '@fabrk/design-system'
import { formatButtonText, formatLabelText } from '@fabrk/design-system'
```

---

## The `mode` Object — Use This in Every Component

`mode` is a config object mapping semantic roles to Tailwind class strings.
It is the primary API. Import it and apply its properties directly in `className`.

```ts
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

<Card className={cn('border border-border', mode.radius)}>
  <button className={cn(mode.radius, mode.font, 'bg-primary text-primary-foreground px-4 py-2')}>
    > SUBMIT
  </button>
</Card>
```

### Border + `mode.radius` Rule — Critical

| Border type | Add `mode.radius`? | Example |
|---|---|---|
| Full border (`border`, `border-2`) | YES | `cn('border border-border', mode.radius)` |
| Partial border (`border-t`, `border-b`, `border-l`, `border-r`) | NO | `'border-t border-border'` |
| Table cells (`<th>`, `<td>`) | NO — breaks layout | just `'border border-border'` |
| Switches | Always `rounded-full` | overrides `mode.radius` by design |

---

## `mode` Properties Reference

### Top-Level Strings

| Property | Value | Purpose |
|---|---|---|
| `mode.radius` | `'rounded-none'` | Border radius for full-bordered elements |
| `mode.font` | `'font-mono'` | Monospace font class |
| `mode.textTransform` | `'uppercase'` | Text casing mode |

### `mode.color` — Semantic Color Tokens

All values are Tailwind class strings.

**Backgrounds** (`mode.color.bg.*`):

| Key | Class | Use for |
|---|---|---|
| `base` | `bg-background` | Page background |
| `surface` | `bg-card` | Card/panel background |
| `surfaceRaised` | `bg-card` | Raised card variant |
| `elevated` | `bg-popover` | Dropdowns, tooltips |
| `accent` | `bg-accent` | CTA, highlighted elements |
| `accentMuted` | `bg-accent/10` | Subtle accent tint |
| `primaryLight` | `bg-primary/10` | Light primary tint |
| `danger` | `bg-destructive` | Error states |
| `dangerMuted` | `bg-destructive/10` | Error background tint |
| `success` | `bg-success` | Success states |
| `successMuted` | `bg-success/10` | Success tint |
| `warning` | `bg-warning` | Warning states |
| `warningMuted` | `bg-warning/10` | Warning tint |
| `infoMuted` | `bg-info/10` | Info tint |
| `muted` | `bg-muted` | Subtle/disabled backgrounds |
| `secondary` | `bg-secondary` | Secondary action backgrounds |

**Text** (`mode.color.text.*`):

| Key | Class | Use for |
|---|---|---|
| `primary` | `text-foreground` | Body text |
| `secondary` | `text-card-foreground` | Secondary text on cards |
| `muted` | `text-muted-foreground` | Secondary/helper text |
| `inverse` | `text-accent-foreground` | Text on accent backgrounds |
| `accent` | `text-accent` | Links, emphasis |
| `danger` | `text-destructive` | Error messages |
| `dangerOnColor` | `text-destructive-foreground` | Text on destructive bg |
| `success` | `text-success` | Success messages |
| `successOnColor` | `text-success-foreground` | Text on success bg |
| `warning` | `text-warning` | Warning messages |
| `warningOnColor` | `text-warning-foreground` | Text on warning bg |
| `info` | `text-info` | Info messages |

**Borders** (`mode.color.border.*`):

| Key | Class |
|---|---|
| `default` | `border-border` |
| `accent` | `border-primary` |
| `danger` | `border-destructive` |
| `success` | `border-success` |
| `warning` | `border-warning` |

### `mode.spacing` — Spacing Tokens

```ts
mode.spacing.button.sm   // 'px-2 py-1'
mode.spacing.button.md   // 'px-4 py-2'
mode.spacing.button.lg   // 'px-6 py-4'
mode.spacing.input       // 'px-4 py-2'
mode.spacing.card        // 'p-4'
mode.spacing.badge.sm    // 'px-2 py-0.5'
mode.spacing.badge.md    // 'px-2 py-1'
```

### `mode.typography` — Type Scale

```ts
mode.typography.body.m        // 'text-body-m'       — 14px body text
mode.typography.button        // 'text-label-m font-medium'
mode.typography.caption       // 'text-caption text-muted-foreground'
mode.typography.input         // 'text-body-m'
mode.typography.label         // 'text-label-m'
```

### `mode.state` — Interactive States

```ts
mode.state.hover.bg          // 'hover:bg-primary/90'
mode.state.hover.text        // 'hover:text-foreground'
mode.state.hover.card        // 'hover:bg-muted/50'
mode.state.hover.opacity     // 'hover:opacity-90'
mode.state.focus.ring        // 'focus-visible:ring-2 focus-visible:ring-ring ...'
mode.state.disabled.opacity  // 'disabled:opacity-50'
mode.state.disabled.cursor   // 'disabled:cursor-not-allowed'
mode.state.muted.opacity     // 'opacity-50'
mode.state.subtle.opacity    // 'opacity-40'
mode.state.secondary.opacity // 'opacity-70'
```

---

## Design Token Classes — Use These Directly in Tailwind

Never hardcode colors. Use these semantic token classes:

**Backgrounds:** `bg-background` `bg-card` `bg-muted` `bg-primary` `bg-secondary`
`bg-destructive` `bg-accent` `bg-success` `bg-warning` `bg-info` `bg-popover`

**Text:** `text-foreground` `text-muted-foreground` `text-primary` `text-primary-foreground`
`text-destructive` `text-success` `text-warning` `text-info` `text-accent` `text-accent-foreground`

**Borders:** `border-border` `border-primary` `border-destructive` `border-ring`
`border-success` `border-warning`

```ts
// CORRECT — tokens work with all themes
<div className="bg-card border border-border text-foreground" />

// WRONG — hardcoded colors break theming
<div className="bg-gray-900 border border-gray-700 text-white" />
```

---

## ThemeProvider

Wraps your app to enable theme switching at runtime via `data-theme` attribute.

```tsx
import { ThemeProvider, ThemeScript } from '@fabrk/design-system'

// In layout.tsx (Next.js App Router):
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Prevents flash of wrong theme on SSR */}
        <ThemeScript storageKey="fabrk-theme" defaultColorTheme="green" />
      </head>
      <body>
        <ThemeProvider defaultTheme="terminal" defaultColorTheme="green">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**`ThemeProviderProps`:** `defaultTheme`, `defaultColorTheme`, `storageKey`, `children`

**`ThemeScriptProps`:** `storageKey`, `storageKeyPrefix`, `defaultColorTheme`, `nonce`

### Theme Hooks

```ts
import { useThemeContext, useOptionalThemeContext } from '@fabrk/design-system'

const { theme, setTheme, colorTheme, setColorTheme } = useThemeContext()
// useOptionalThemeContext() returns null if not inside ThemeProvider
```

### Available Themes

Currently one theme: `'terminal'` (sharp corners, monospace, uppercase).
`ThemeName = 'terminal'`

Color themes are applied via CSS variables using the `data-theme` attribute on `<html>`.

---

## Text Formatting Utilities

```ts
import { formatButtonText, formatLabelText, formatCardHeader } from '@fabrk/design-system'

formatButtonText('submit')          // '> SUBMIT'
formatLabelText('status')           // '[STATUS]'
formatCardHeader('Overview', 'OVR') // '[OVR] OVERVIEW'
```

---

## Chart Colors

```ts
import { getChartColors, getChartColor, getChartColorVars, CHART_FALLBACK_COLORS } from '@fabrk/design-system'

getChartColors()            // string[] — up to 9 colors (CSS vars if available, hex fallbacks otherwise)
getChartColor(0)            // string — first chart color
getChartColorVars()         // string[] — array of 'oklch(var(--chart-N))' CSS var references
```

---

## ModeConfig Interface

The full TypeScript type for `mode`:

```ts
import type { ModeConfig } from '@fabrk/design-system'

const myMode: ModeConfig = mode
```

`ModeConfig` has these top-level keys: `radius`, `font`, `textTransform`, `color`, `spacing`, `typography`, `state`.

---

## Design Token Enforcement

Three layers enforce the "no hardcoded colors" rule. They share the same violation definition: any Tailwind utility with a numeric color scale (`bg-blue-500`, `text-red-400`, `border-gray-200`) or bare white/black (`bg-white`, `text-black`). Responsive and state variants are stripped before checking (`hover:bg-blue-500` → `bg-blue-500`).

**Allowed:** `bg-primary`, `bg-card`, `bg-muted`, `bg-secondary`, `bg-accent`, `bg-destructive`, `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `text-success`, `border-border`, `border-primary`, `border-input`, `border-destructive`, and all other semantic tokens.

**Blocked:** `bg-blue-500`, `text-red-400`, `bg-white`, `text-black`, `border-gray-200`, `ring-purple-300`, arbitrary hex values (`bg-[#ff0000]`), gradient stops (`from-blue-500`), etc.

### Layer 1 — ESLint rule `fabrk/no-hardcoded-colors`

Error-level. Runs in CI. Checks `className=`, `cn()`, and `clsx()` call sites statically.

### Layer 2 — Vite plugin `fabrk:design-system`

Warns at dev-server transform time when a source file contains a hardcoded color class. Zero overhead in production builds.

### Layer 3 — `checkDesignTokens()` (programmatic)

```ts
import { checkDesignTokens, isDesignSystemCompliant } from '@fabrk/design-system'

const violations = checkDesignTokens('bg-blue-500 text-white p-4')
// → [
//   { class: 'bg-blue-500', suggestion: 'use bg-background, bg-card, ...' },
//   { class: 'text-white',  suggestion: 'use text-foreground, ...' },
// ]

isDesignSystemCompliant('bg-card text-foreground p-4') // true
isDesignSystemCompliant('bg-white text-black')         // false
```

Use in tests to assert that generated className strings are compliant before they reach the DOM.

### `DesignTokenViolation` Interface

```ts
import type { DesignTokenViolation } from '@fabrk/design-system'

interface DesignTokenViolation {
  class: string        // the offending class (with any variant prefix)
  suggestion?: string  // human-readable replacement hint
}
```
