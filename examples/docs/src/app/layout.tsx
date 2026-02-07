import type { Metadata } from 'next'
import { Sidebar } from '@/components/sidebar'
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
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
