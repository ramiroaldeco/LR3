'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tournament, Category } from '@/lib/types'

export default function PartidosPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTorneo, setFilterTorneo] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: ms }, { data: ts }, { data: cs }] = await Promise.all([
      supabase.from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*, clubs(*)), away_team:teams!matches_away_team_id_fkey(*, clubs(*)), rounds(number, name), categories(name), tournaments(name,year)').order('created_at', { ascending: false }).limit(200),
      supabase.from('tournaments').select('*').order('year', { ascending: false }),
      supabase.from('categories').select('*').order('display_order'),
    ])
    setMatches(ms ?? []); setTorneos(ts ?? []); setCategorias(cs ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const displayCats = categorias.filter(c => !filterTorneo || c.tournament_id === filterTorneo)
  const displayMatches = matches.filter(m =>
    (!filterTorneo || m.tournament_id === filterTorneo) &&
    (!filterCat || m.category_id === filterCat) &&
    (!filterStatus || m.status === filterStatus)
  )

  const statusLabel: Record<string, string> = { pending: 'Pendiente', finished: 'Finalizado', suspended: 'Suspendido', postponed: 'Postergado' }
  const statusClass: Record<string, string> = { pending: 'badge-gray', finished: 'badge-green', suspended: 'badge-red', postponed: 'badge-yellow' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Partidos</h1>
          <p className="page-subtitle">{displayMatches.length} partido{displayMatches.length !== 1 ? 's' : ''} encontrado{displayMatches.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="select" style={{ maxWidth: '200px' }} value={filterTorneo} onChange={e => { setFilterTorneo(e.target.value); setFilterCat('') }}>
          <option value="">Todos los torneos</option>
          {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
        </select>
        <select className="select" style={{ maxWidth: '200px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {displayCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" style={{ maxWidth: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="finished">Finalizado</option>
          <option value="suspended">Suspendido</option>
          <option value="postponed">Postergado</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : displayMatches.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚽</div>
            No hay partidos con los filtros seleccionados.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoría / Fecha</th>
                <th>Local</th>
                <th style={{ textAlign: 'center' }}>Resultado</th>
                <th>Visitante</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayMatches.map((m: any) => {
                const round = Array.isArray(m.rounds) ? m.rounds[0] : m.rounds
                const cat = Array.isArray(m.categories) ? m.categories[0] : m.categories
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{cat?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Fecha {round?.number}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {m.home_team?.clubs?.shield_url && <img src={m.home_team.clubs.shield_url} alt="" className="shield-img" />}
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>{m.home_team?.clubs?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {m.status === 'finished' ? (
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{m.home_goals} — {m.away_goals}</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {m.away_team?.clubs?.shield_url && <img src={m.away_team.clubs.shield_url} alt="" className="shield-img" />}
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>{m.away_team?.clubs?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusClass[m.status]}`}>{statusLabel[m.status]}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => router.push(`/fechas/${m.round_id}`)}>
                        Ir a fecha
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
