import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { FabrkProvider } from '@fabrk/core'
import fabrkConfig from '../fabrk.config'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FABRK App',
  description: 'Built with FABRK Framework',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FabrkProvider defaultColorTheme="green" config={fabrkConfig}>
          {children}
        </FabrkProvider>
      </body>
    </html>
  )
}
