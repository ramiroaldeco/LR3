'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/torneos', icon: '🏆', label: 'Torneos' },
  { href: '/categorias', icon: '📋', label: 'Categorías' },
  { href: '/clubes', icon: '🛡️', label: 'Clubes' },
  { href: '/equipos', icon: '👥', label: 'Equipos' },
  { href: '/fechas', icon: '📅', label: 'Fechas' },
  { href: '/partidos', icon: '⚽', label: 'Partidos' },
  { href: '/tabla', icon: '📈', label: 'Tabla de posiciones' },
  { href: '/exportar', icon: '🖼️', label: 'Exportar placa' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: '#0d1420',
      borderRight: '1px solid #2a3a4a',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #2a3a4a',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          width: '38px', height: '38px',
          background: 'linear-gradient(135deg, #0B6B3A, #20B26B)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
        }}>⚽</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', lineHeight: 1.2 }}>
            Liga Río Tres
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Panel
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : '#94a3b8',
                background: active ? 'rgba(11,107,58,0.25)' : 'transparent',
                borderLeft: active ? '3px solid #20B26B' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '1rem', borderTop: '1px solid #2a3a4a' }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 0.9rem',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <span>🚪</span>
          {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
