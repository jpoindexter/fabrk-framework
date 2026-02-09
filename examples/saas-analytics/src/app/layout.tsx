import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FABRK SaaS Analytics Dashboard',
  description: 'SaaS analytics dashboard example built with FABRK Framework',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
