import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KAZA — Conciergerie',
  description: 'Gestion de conciergerie Airbnb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  )
}
