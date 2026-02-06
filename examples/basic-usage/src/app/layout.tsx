import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FABRK Basic Example',
  description: 'Basic usage example for FABRK Framework',
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
