'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tournament, Category, Round, StandingRow } from '@/lib/types'

export default function TablaPage() {
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [selTorneo, setSelTorneo] = useState('')
  const [selCat, setSelCat] = useState('')
  const [selRound, setSelRound] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchMeta = async () => {
      const [{ data: ts }, { data: cs }] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('categories').select('*').order('display_order'),
      ])
      setTorneos(ts ?? [])
      setCategorias(cs ?? [])
    }
    fetchMeta()
  }, [supabase])

  useEffect(() => {
    if (!selTorneo || !selCat) { setRounds([]); return }
    const fetch = async () => {
      const { data } = await supabase.from('rounds').select('*').eq('tournament_id', selTorneo).eq('category_id', selCat).order('number')
      setRounds(data ?? [])
    }
    fetch()
  }, [selTorneo, selCat, supabase])

  const calcularTablaClient = useCallback(async () => {
    if (!selTorneo || !selCat) return
    setLoading(true)

    // Get teams
    const { data: teams } = await supabase.from('teams').select('id, club_id, clubs(id, name, shield_url)').eq('tournament_id', selTorneo).eq('category_id', selCat).eq('active', true)
    if (!teams) { setLoading(false); return }

    const standingsMap: Record<string, StandingRow> = {}
    for (const t of teams) {
      const club = Array.isArray(t.clubs) ? t.clubs[0] : t.clubs as any
      standingsMap[t.id] = {
        club_id: t.club_id, team_id: t.id,
        club_name: club?.name ?? '?', shield_url: club?.shield_url ?? null,
        PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0,
      }
    }

    // Get matches
    let query = supabase.from('matches').select('*, rounds(number)').eq('tournament_id', selTorneo).eq('category_id', selCat).eq('status', 'finished')
    const { data: matchData } = await query
    const filteredMatches = selRound && matchData
      ? matchData.filter((m: any) => {
        const r = Array.isArray(m.rounds) ? m.rounds[0] : m.rounds
        const maxRound = rounds.find(r2 => r2.id === selRound)?.number ?? 99999
        return (r?.number ?? 0) <= maxRound
      })
      : (matchData ?? [])

    for (const m of filteredMatches) {
      const home = standingsMap[m.home_team_id]
      const away = standingsMap[m.away_team_id]
      if (!home || !away || m.home_goals === null || m.away_goals === null) continue
      const hg = m.home_goals, ag = m.away_goals
      home.PJ++; away.PJ++
      home.GF += hg; home.GC += ag
      away.GF += ag; away.GC += hg
      if (hg > ag) { home.PG++; home.PTS += 3; away.PP++ }
      else if (hg < ag) { away.PG++; away.PTS += 3; home.PP++ }
      else { home.PE++; home.PTS++; away.PE++; away.PTS++ }
    }

    const rows = Object.values(standingsMap).map(r => ({ ...r, DG: r.GF - r.GC }))
    rows.sort((a, b) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS
      if (b.DG !== a.DG) return b.DG - a.DG
      if (b.GF !== a.GF) return b.GF - a.GF
      return a.club_name.localeCompare(b.club_name)
    })

    setStandings(rows)
    setLoading(false)
  }, [selTorneo, selCat, selRound, supabase, rounds])

  useEffect(() => {
    if (selTorneo && selCat) calcularTablaClient()
    else setStandings([])
  }, [selTorneo, selCat, selRound, calcularTablaClient])

  const filteredCats = categorias.filter(c => !selTorneo || c.tournament_id === selTorneo)
  const selTorneoObj = torneos.find(t => t.id === selTorneo)
  const selCatObj = categorias.find(c => c.id === selCat)
  const selRoundObj = rounds.find(r => r.id === selRound)

  const stat = (v: number, classes = '') => (
    <td style={{ textAlign: 'center', fontSize: '0.875rem' }} className={classes}>{v}</td>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tabla de posiciones</h1>
          <p className="page-subtitle">Calculada automáticamente desde partidos finalizados</p>
        </div>
        {standings.length > 0 && (
          <a href={`/exportar?torneo=${selTorneo}&cat=${selCat}&round=${selRound}`} className="btn-primary">
            🖼️ Exportar placa
          </a>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select className="select" style={{ maxWidth: '220px' }} value={selTorneo} onChange={e => { setSelTorneo(e.target.value); setSelCat(''); setSelRound(''); setStandings([]) }}>
          <option value="">Seleccioná un torneo</option>
          {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
        </select>
        <select className="select" style={{ maxWidth: '220px' }} value={selCat} onChange={e => { setSelCat(e.target.value); setSelRound('') }} disabled={!selTorneo}>
          <option value="">Seleccioná categoría</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" style={{ maxWidth: '220px' }} value={selRound} onChange={e => setSelRound(e.target.value)} disabled={!selCat}>
          <option value="">Todas las fechas</option>
          {rounds.map(r => <option key={r.id} value={r.id}>Hasta Fecha {r.number}{r.name ? ` — ${r.name}` : ''}</option>)}
        </select>
      </div>

      {!selTorneo || !selCat ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📈</div>
          Seleccioná un torneo y una categoría para ver la tabla.
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Calculando tabla...</div>
      ) : standings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          No hay partidos finalizados en esta categoría todavía.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            {selCatObj?.name} · {selTorneoObj?.name} {selTorneoObj?.year}
            {selRoundObj ? ` · Hasta Fecha ${selRoundObj.number}` : ' · Todas las fechas'}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Club</th>
                  <th style={{ textAlign: 'center' }}>PJ</th>
                  <th style={{ textAlign: 'center' }}>PG</th>
                  <th style={{ textAlign: 'center' }}>PE</th>
                  <th style={{ textAlign: 'center' }}>PP</th>
                  <th style={{ textAlign: 'center' }}>GF</th>
                  <th style={{ textAlign: 'center' }}>GC</th>
                  <th style={{ textAlign: 'center' }}>DG</th>
                  <th style={{ textAlign: 'center', color: '#D6A848', fontWeight: 700 }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.team_id} style={{
                    background: i === 0 ? 'rgba(214,168,72,0.06)' : undefined,
                    borderLeft: i === 0 ? '3px solid #D6A848' : '3px solid transparent',
                  }}>
                    <td style={{ fontWeight: 700, color: i === 0 ? '#D6A848' : '#94a3b8', textAlign: 'center' }}>
                      {i + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {row.shield_url ? (
                          <img src={row.shield_url} alt={row.club_name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', background: '#2a3a4a', borderRadius: '4px' }} />
                        )}
                        <span style={{ fontWeight: 600, color: '#fff' }}>{row.club_name}</span>
                      </div>
                    </td>
                    {stat(row.PJ)}
                    {stat(row.PG)}
                    {stat(row.PE)}
                    {stat(row.PP)}
                    {stat(row.GF)}
                    {stat(row.GC)}
                    <td style={{ textAlign: 'center', color: row.DG > 0 ? '#20B26B' : row.DG < 0 ? '#f87171' : '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
                      {row.DG > 0 ? `+${row.DG}` : row.DG}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#D6A848' }}>{row.PTS}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
