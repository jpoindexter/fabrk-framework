import type { Metadata } from 'next'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { TableOfContents } from '@/components/toc'
import { ThemeWrapper } from '@/components/theme-wrapper'
import { ThemeScript } from '@fabrk/themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'FABRK Docs — Framework for AI Coding Agents',
  description: 'The first UI framework designed for AI coding agents. Build full-stack apps in minutes with pre-built components and tools.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript storageKey="fabrk-docs-theme" defaultColorTheme="green" />
      </head>
      <body className="flex min-h-screen">
        <ThemeWrapper>
          <Sidebar />
          <MobileNav />
          <main className="flex-1 overflow-y-auto min-h-screen">
            <div className="flex">
              <div className="flex-1 min-w-0 pt-16 md:pt-0">
                {children}
              </div>
              <TableOfContents />
            </div>
          </main>
        </ThemeWrapper>
      </body>
    </html>
  )
}
