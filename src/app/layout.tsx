import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/nunito/latin-900.css'
import type { Metadata } from 'next'
import { PublicLoadingScreen } from '@/components/marketing/public-loading-screen'
import logoIcon from './Kora-Thryve-Co-Logo.png'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kora Thryve & Co.',
  description: 'Kora Thryve & Co. – Life, Organization, Voice, and Education.',
  icons: {
    icon: logoIcon.src,
    shortcut: logoIcon.src,
    apple: logoIcon.src,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <PublicLoadingScreen />
      </body>
    </html>
  )
}
