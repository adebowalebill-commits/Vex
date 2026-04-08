import type { Metadata } from 'next'
import AuthProvider from '@/components/providers/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.vexiumverse.io'),
  title: 'VexiumVerse — Economic Operating System for Discord',
  description: 'Transform your Discord server into a living, breathing economy with businesses, citizens, resources, and markets.',
  openGraph: {
    title: 'VexiumVerse — Economic Operating System for Discord',
    description: 'Transform your Discord server into a living, breathing economy with businesses, citizens, resources, and markets.',
    url: 'https://www.vexiumverse.io',
    siteName: 'VexiumVerse',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VexiumVerse',
    description: 'Economic infrastructure for Discord communities.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
