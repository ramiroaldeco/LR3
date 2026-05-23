import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Liga Río Tres — Panel Administrativo',
  description: 'Panel de gestión deportiva para la Liga Regional de Fútbol Río Tercero',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
