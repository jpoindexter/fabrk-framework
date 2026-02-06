# @fabrk/design-system

Terminal-inspired design system with 18 themes and design tokens.

## Installation

```bash
npm install @fabrk/design-system
```

## Usage

```tsx
import { ThemeProvider } from '@fabrk/design-system'

export default function App({ children }) {
  return (
    <ThemeProvider defaultColorTheme="green">
      {children}
    </ThemeProvider>
  )
}
```

## Available Themes

18 terminal-inspired color themes:

- green (default), amber, blue, cyan, gray, indigo, lime, magenta
- orange, pink, purple, red, rose, sky, teal, violet, yellow, zinc

## Features

- **18 Color Themes** - Terminal-inspired palettes
- **Design Tokens** - Consistent spacing, typography, colors
- **Dark Mode** - Built-in dark mode support
- **CSS Variables** - Easy customization
- **Type-safe** - Full TypeScript support

## Customization

```tsx
import { useThemeContext } from '@fabrk/design-system'

function ThemeSwitcher() {
  const { setColorTheme } = useThemeContext()
  return (
    <button onClick={() => setColorTheme('cyan')}>
      Switch to Cyan
    </button>
  )
}
```

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
