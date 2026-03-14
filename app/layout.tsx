import type { Metadata } from 'next'
import './globals.css';
export const metadata = {
  title: 'Maker Studio Pro',
  description: 'Gere os teus STLs de forma profissional',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f0f1e' }}>
        {children}
      </body>
    </html>
  )
}