import type { Metadata } from 'next'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { TableOfContents } from '@/components/toc'
import { ThemeWrapper } from '@/components/theme-wrapper'
import { ThemeScript } from '@fabrk/design-system'
import './globals.css'

export const metadata: Metadata = {
  title: 'FABRK Docs — Framework for AI Coding Agents',
  description: 'Modular full stack framework built for AI assisted development. 109+ components, 18 themes, auth, payments, AI, security.',
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
          <main className="flex-1 min-w-0">
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
