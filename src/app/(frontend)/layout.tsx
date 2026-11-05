import type { Metadata } from 'next'
import { Atkinson_Hyperlegible, Schibsted_Grotesk } from 'next/font/google'
import React from 'react'

import './globals.css'

// Atkinson Hyperlegible was designed for low-vision readers, which suits our players.
const body = Atkinson_Hyperlegible({ subsets: ['latin', 'latin-ext'], weight: ['400', '700'], variable: '--font-atkinson' })
const display = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-schibsted' })

export const metadata: Metadata = {
  title: 'Scamdle',
  description: 'Three short exercises a day to practise spotting scams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen bg-navy text-paper antialiased">{children}</body>
    </html>
  )
}
