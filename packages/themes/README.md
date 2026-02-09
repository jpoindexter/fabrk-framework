# @fabrk/themes

Opt-in theming layer for FABRK applications. Re-exports the design system from `@fabrk/design-system` as a standalone package, similar to how shadcn/ui is separate from Next.js.

## Installation

```bash
npm install @fabrk/themes
```

## Usage

```tsx
import { ThemeProvider, mode } from '@fabrk/themes'

export default function RootLayout({ children }) {
  return (
    <ThemeProvider defaultColorTheme="green">
      {children}
    </ThemeProvider>
  )
}

// In components, use the mode object for theme-aware styling
function Card() {
  return (
    <div className={cn('border bg-card', mode.radius, mode.font)}>
      <h2 className="text-foreground">Content</h2>
    </div>
  )
}
```

## Features

- **ThemeProvider** - React context provider with `useThemeContext` and `useOptionalThemeContext` hooks
- **ThemeScript** - Server-side script injection for flash-free theme hydration
- **Mode Object** - Design tokens for consistent component styling (radius, font, spacing)
- **18 Themes** - Pre-built color themes accessible via `themes`, `themeClasses`, and `themeUtils`
- **Terminal Theme** - Monospace terminal aesthetic with `terminalTheme`, `terminalClasses`, and text formatting helpers
- **Design Tokens** - Full token set including `colors`, `space`, `fontFamily`, `fontSize`, `radius`, `shadow`, `duration`, `easing`, `breakpoint`, `zIndex`, and `accessibility`
- **Chart Colors** - `getChartColors`, `getChartColor`, and `getChartColorVars` for theme-aware data visualizations
- **Text Formatting** - `formatButtonText`, `formatLabelText`, `formatCardHeader`, `formatLabel`, `formatCardTitle` for terminal-style casing conventions

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
