import type { Metadata } from 'next'
import { FabrkProvider } from '@fabrk/core'
import { ThemeProvider } from '@fabrk/design-system'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboard — FABRK',
  description: 'Analytics dashboard built with FABRK Framework',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultColorTheme="green">
          <FabrkProvider>
            {children}
          </FabrkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
