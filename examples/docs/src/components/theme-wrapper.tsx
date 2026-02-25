'use client'

import { ThemeProvider } from '@fabrk/design-system'

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultColorTheme="green" storageKey="fabrk-docs-theme">
      {children}
    </ThemeProvider>
  )
}
