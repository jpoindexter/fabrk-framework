'use client'

import { ThemeProvider } from '@fabrk/themes'

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultColorTheme="green" storageKey="fabrk-docs-theme">
      {children}
    </ThemeProvider>
  )
}
