import type { Metadata } from 'next'
import React from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Scamdle',
  description: 'Three short exercises a day to practise spotting scams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  )
}
