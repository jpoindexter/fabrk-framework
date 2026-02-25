# @fabrk/design-system — Agent Reference

Token-driven, terminal-aesthetic design system. The `mode` object is what you use in components.

```ts
import { mode } from '@fabrk/design-system'
import { ThemeProvider, ThemeScript } from '@fabrk/design-system'
import { formatButtonText, formatLabelText } from '@fabrk/design-system'
```

---

## The `mode` Object — Use This in Every Component

`mode` is a flat config object mapping semantic roles to Tailwind class strings.
It is the primary API. Import it and apply its properties directly in `className`.

```ts
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

<Card className={cn('border border-border', mode.radius)}>
  <button className={cn(mode.radius, mode.font, 'bg-primary text-primary-foreground px-4 py-2')}>
    {mode.buttonPrefix}SUBMIT
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
| `mode.shadow` | `'shadow-sm'` | Default shadow |
| `mode.buttonPrefix` | `'> '` | Prepend to button text: `> SUBMIT` |
| `mode.inputStyle` | Tailwind input classes | Apply to `<input>` elements |
| `mode.borderWidth` | `'border'` | Default border-width class |
| `mode.textTransform` | `'uppercase'` | Text casing mode |
| `mode.labelFormat` | `'brackets'` | Labels render as `[LABEL]` |
| `mode.cardHeader` | `'bracketed'` | Card titles render as `[TITLE]` |

### `mode.color` — Semantic Color Tokens

All values are Tailwind class strings.

**Backgrounds** (`mode.color.bg.*`):

| Key | Class | Use for |
|---|---|---|
| `base` | `bg-background` | Page background |
| `surface` | `bg-card` | Card/panel background |
| `elevated` | `bg-popover` | Dropdowns, tooltips |
| `accent` | `bg-accent` | CTA, highlighted elements |
| `accentMuted` | `bg-accent/10` | Subtle accent tint |
| `danger` | `bg-destructive` | Error states |
| `dangerMuted` | `bg-destructive/10` | Error background tint |
| `success` | `bg-success` | Success states |
| `warning` | `bg-warning` | Warning states |
| `muted` | `bg-muted` | Subtle/disabled backgrounds |

**Text** (`mode.color.text.*`):

| Key | Class | Use for |
|---|---|---|
| `primary` | `text-foreground` | Body text |
| `muted` | `text-muted-foreground` | Secondary/helper text |
| `accent` | `text-accent` | Links, emphasis |
| `danger` | `text-destructive` | Error messages |
| `success` | `text-success` | Success messages |
| `warning` | `text-warning` | Warning messages |
| `inverse` | `text-accent-foreground` | Text on accent backgrounds |

**Borders** (`mode.color.border.*`):

| Key | Class |
|---|---|
| `default` | `border-border` |
| `focus` | `border-ring` |
| `accent` | `border-primary` |
| `danger` | `border-destructive` |
| `success` | `border-success` |
| `warning` | `border-warning` |

**Icons** (`mode.color.icon.*`): same pattern — `primary`, `muted`, `accent`, `danger`, `success`, `warning`, `info`

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

### `mode.typography` — M3 Type Scale

```ts
mode.typography.display.xl    // 'text-display-xl'  — 88px hero
mode.typography.display.l     // 'text-display-l'   — 57px
mode.typography.headline.l    // 'text-headline-l'  — 32px page title
mode.typography.headline.s    // 'text-headline-s'  — 24px
mode.typography.title.l       // 'text-title-l'     — 22px section header
mode.typography.title.m       // 'text-title-m'     — 16px
mode.typography.body.l        // 'text-body-l'      — 16px running text
mode.typography.body.m        // 'text-body-m'      — 14px
mode.typography.label.m       // 'text-label-m'     — 12px UI label
mode.typography.code.m        // 'text-code-m'      — 14px terminal output

// Legacy aliases (still work)
mode.typography.button        // 'text-label-m font-medium'
mode.typography.caps          // 'uppercase tracking-caps'
```

### `mode.sizing` — Layout Sizing Tokens

```ts
mode.sizing.panel          // 'h-panel'       — 600px
mode.sizing.panelSm        // 'h-panel-sm'    — 400px
mode.sizing.sidebar        // 'w-sidebar'     — 288px
mode.sizing.auth           // 'max-w-auth'    — 400px (auth pages)
mode.sizing.dropdown       // 'min-w-dropdown'
mode.sizing.touch          // 'min-h-touch min-w-touch'  — 44px WCAG touch target
```

### `mode.state` — Interactive States

```ts
mode.state.hover.bg          // 'hover:bg-primary/90'
mode.state.hover.card        // 'hover:bg-muted/50'
mode.state.hover.link        // 'hover:text-primary'
mode.state.focus.ring        // 'focus-visible:ring-2 focus-visible:ring-ring ...'
mode.state.disabled.opacity  // 'disabled:opacity-50'
mode.state.disabled.cursor   // 'disabled:cursor-not-allowed'
```

### `mode.zIndex`

```ts
mode.zIndex.banner    // 'z-banner'  — z-60 (cookie consent, floating notices)
mode.zIndex.modal     // 'z-modal'   — z-100 (modals, toast, nav)
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
import { formatButtonText, formatLabelText, formatCardHeader, formatStatusText } from '@fabrk/design-system'

formatButtonText('submit')          // '> SUBMIT'
formatLabelText('status')           // '[STATUS]'
formatCardHeader('Overview', 'OVR') // '[OVR] OVERVIEW'
formatStatusText('active')          // 'ACTIVE'
```

Aliases also available from backwards-compat layer:
```ts
import { formatLabel, formatCardTitle } from '@fabrk/design-system'
```

---

## Chart Colors

```ts
import { getChartColors, getChartColor, getChartColorVars, CHART_FALLBACK_COLORS } from '@fabrk/design-system'

getChartColors(5)           // string[] — 5 CSS var references for chart series
getChartColor(0)            // string — first chart color
getChartColorVars()         // { '--chart-1': ..., '--chart-2': ..., ... }
```

---

## Helpers

```ts
import { isSharpMode } from '@fabrk/design-system'
isSharpMode()   // true (terminal theme is always sharp)
```

---

## ModeConfig Interface

The full TypeScript type for `mode`:

```ts
import type { ModeConfig } from '@fabrk/design-system'

const myMode: ModeConfig = mode  // full type with color, spacing, typography, sizing, state, zIndex
```
