import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: torneos },
    { count: clubes },
    { count: partidos },
    { count: fechas },
  ] = await Promise.all([
    supabase.from('tournaments').select('*', { count: 'exact', head: true }),
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('rounds').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Torneos', value: torneos ?? 0, icon: '🏆', color: '#D6A848' },
    { label: 'Clubes', value: clubes ?? 0, icon: '🛡️', color: '#20B26B' },
    { label: 'Fechas', value: fechas ?? 0, icon: '📅', color: '#60a5fa' },
    { label: 'Partidos', value: partidos ?? 0, icon: '⚽', color: '#a78bfa' },
  ]

  const accesos = [
    { href: '/torneos', icon: '🏆', label: 'Torneos', desc: 'Crear y gestionar torneos' },
    { href: '/categorias', icon: '📋', label: 'Categorías', desc: 'Primera A, Reserva A, etc.' },
    { href: '/clubes', icon: '🛡️', label: 'Clubes', desc: 'Cargar clubes y escudos' },
    { href: '/equipos', icon: '👥', label: 'Equipos', desc: 'Asociar clubes a categorías' },
    { href: '/fechas', icon: '📅', label: 'Fechas', desc: 'Crear fechas del torneo' },
    { href: '/partidos', icon: '⚽', label: 'Partidos', desc: 'Cargar y actualizar resultados' },
    { href: '/tabla', icon: '📈', label: 'Tabla', desc: 'Ver tabla de posiciones' },
    { href: '/exportar', icon: '🖼️', label: 'Exportar', desc: 'Generar placa PNG para redes' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Bienvenido al panel de gestión de la Liga Río Tres</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
            <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick access — CSS-only hover via .quick-card class */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Acceso rápido
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {accesos.map(a => (
          <a key={a.href} href={a.href} className="quick-card">
            <span className="quick-card-icon">{a.icon}</span>
            <span className="quick-card-title">{a.label}</span>
            <span className="quick-card-desc">{a.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
