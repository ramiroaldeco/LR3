'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tournament, Category, Round, StandingRow } from '@/lib/types'
import { Suspense } from 'react'

function ExportarContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [selTorneo, setSelTorneo] = useState(searchParams.get('torneo') ?? '')
  const [selCat, setSelCat] = useState(searchParams.get('cat') ?? '')
  const [selRound, setSelRound] = useState(searchParams.get('round') ?? '')
  const [titulo, setTitulo] = useState('TABLA DE POSICIONES')
  const [sponsor, setSponsor] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetch = async () => {
      const [{ data: ts }, { data: cs }] = await Promise.all([
        supabase.from('tournaments').select('*').order('year', { ascending: false }),
        supabase.from('categories').select('*').order('display_order'),
      ])
      setTorneos(ts ?? []); setCategorias(cs ?? [])
    }
    fetch()
  }, [supabase])

  useEffect(() => {
    if (!selTorneo || !selCat) { setRounds([]); return }
    const fetch = async () => {
      const { data } = await supabase.from('rounds').select('*').eq('tournament_id', selTorneo).eq('category_id', selCat).order('number')
      setRounds(data ?? [])
    }
    fetch()
  }, [selTorneo, selCat, supabase])

  const calcular = useCallback(async () => {
    if (!selTorneo || !selCat) return
    setLoading(true)
    const { data: teams } = await supabase.from('teams').select('id, club_id, clubs(id, name, shield_url)').eq('tournament_id', selTorneo).eq('category_id', selCat).eq('active', true)
    if (!teams) { setLoading(false); return }

    const map: Record<string, StandingRow> = {}
    for (const t of teams) {
      const club = Array.isArray(t.clubs) ? t.clubs[0] : t.clubs as any
      map[t.id] = { club_id: t.club_id, team_id: t.id, club_name: club?.name ?? '?', shield_url: club?.shield_url ?? null, PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0 }
    }

    const { data: matchData } = await supabase.from('matches').select('*, rounds(number)').eq('tournament_id', selTorneo).eq('category_id', selCat).eq('status', 'finished')
    const filtered = selRound && matchData
      ? matchData.filter((m: any) => {
          const r = Array.isArray(m.rounds) ? m.rounds[0] : m.rounds
          const max = rounds.find(r2 => r2.id === selRound)?.number ?? 99999
          return (r?.number ?? 0) <= max
        })
      : (matchData ?? [])

    for (const m of filtered) {
      const home = map[m.home_team_id], away = map[m.away_team_id]
      if (!home || !away || m.home_goals === null || m.away_goals === null) continue
      const hg = m.home_goals, ag = m.away_goals
      home.PJ++; away.PJ++; home.GF += hg; home.GC += ag; away.GF += ag; away.GC += hg
      if (hg > ag) { home.PG++; home.PTS += 3; away.PP++ }
      else if (hg < ag) { away.PG++; away.PTS += 3; home.PP++ }
      else { home.PE++; home.PTS++; away.PE++; away.PTS++ }
    }

    const rows = Object.values(map).map(r => ({ ...r, DG: r.GF - r.GC }))
    rows.sort((a, b) => b.PTS - a.PTS || b.DG - a.DG || b.GF - a.GF || a.club_name.localeCompare(b.club_name))
    setStandings(rows)
    setLoading(false)
  }, [selTorneo, selCat, selRound, supabase, rounds])

  useEffect(() => { if (selTorneo && selCat) calcular(); else setStandings([]) }, [selTorneo, selCat, selRound, calcular])

  const handleExport = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1350,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      const catName = categorias.find(c => c.id === selCat)?.name ?? 'tabla'
      link.download = `tabla-${catName.replace(/[\s"]/g, '_')}.png`
      link.click()
    } catch (err) {
      console.error('Export error:', err)
      alert('Error al exportar. Intentá de nuevo.')
    }
    setExporting(false)
  }

  const filteredCats = categorias.filter(c => !selTorneo || c.tournament_id === selTorneo)
  const selTorneoObj = torneos.find(t => t.id === selTorneo)
  const selCatObj = categorias.find(c => c.id === selCat)
  const selRoundObj = rounds.find(r => r.id === selRound)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Exportar placa para redes</h1>
          <p className="page-subtitle">Generá una imagen PNG 1080×1350 lista para Instagram</p>
        </div>
        {standings.length > 0 && (
          <button className="btn-primary" onClick={handleExport} disabled={exporting} style={{ fontSize: '0.9rem', padding: '0.7rem 1.4rem' }}>
            {exporting ? '⏳ Exportando...' : '⬇️ Descargar PNG'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Controls */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuración</h3>

          <div className="form-group">
            <label>Torneo</label>
            <select className="select" value={selTorneo} onChange={e => { setSelTorneo(e.target.value); setSelCat(''); setSelRound('') }}>
              <option value="">Seleccioná</option>
              {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select className="select" value={selCat} onChange={e => { setSelCat(e.target.value); setSelRound('') }} disabled={!selTorneo}>
              <option value="">Seleccioná</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Hasta fecha</label>
            <select className="select" value={selRound} onChange={e => setSelRound(e.target.value)} disabled={!selCat}>
              <option value="">Todas las fechas</option>
              {rounds.map(r => <option key={r.id} value={r.id}>Fecha {r.number}{r.name ? ` — ${r.name}` : ''}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Título personalizado</label>
            <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="TABLA DE POSICIONES" />
          </div>

          <div className="form-group">
            <label>Sponsor (opcional)</label>
            <input className="input" value={sponsor} onChange={e => setSponsor(e.target.value)} placeholder="Ej: Pastas Óptimas" />
          </div>

          {standings.length > 0 && (
            <button className="btn-primary" onClick={handleExport} disabled={exporting} style={{ justifyContent: 'center' }}>
              {exporting ? '⏳ Exportando...' : '⬇️ Descargar PNG 1080×1350'}
            </button>
          )}
        </div>

        {/* Preview */}
        <div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>Vista previa (escala reducida)</p>
          {!selTorneo || !selCat ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🖼️</div>
              Seleccioná torneo y categoría para generar la placa.
            </div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Calculando...</div>
          ) : (
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%' }}>
              {/* THE EXPORTABLE CARD — 1080x1350 */}
              <div
                ref={cardRef}
                style={{
                  width: '1080px',
                  height: '1350px',
                  background: 'linear-gradient(160deg, #062B1A 0%, #0B3D24 40%, #0B6B3A 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Background decorative elements */}
                <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(32,178,107,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(11,107,58,0.15)', pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{
                  padding: '60px 72px 40px',
                  borderBottom: '2px solid rgba(214,168,72,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px', fontWeight: 800, color: '#D6A848',
                      letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '8px',
                    }}>
                      Liga Río Tres
                    </div>
                    <div style={{
                      fontSize: '52px', fontWeight: 900, color: '#FFFFFF',
                      lineHeight: 1, letterSpacing: '-0.02em',
                    }}>
                      {titulo}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'rgba(214,168,72,0.15)', border: '1px solid rgba(214,168,72,0.4)',
                        color: '#D6A848', padding: '6px 18px', borderRadius: '999px',
                        fontSize: '18px', fontWeight: 700,
                      }}>
                        {selCatObj?.name}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.8)', padding: '6px 18px', borderRadius: '999px',
                        fontSize: '18px', fontWeight: 600,
                      }}>
                        {selTorneoObj?.name} {selTorneoObj?.year}
                      </span>
                      {selRoundObj && (
                        <span style={{
                          background: 'rgba(32,178,107,0.15)', border: '1px solid rgba(32,178,107,0.3)',
                          color: '#20B26B', padding: '6px 18px', borderRadius: '999px',
                          fontSize: '18px', fontWeight: 600,
                        }}>
                          Hasta Fecha {selRoundObj.number}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* League logo placeholder */}
                  <div style={{
                    width: '120px', height: '120px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '2px solid rgba(214,168,72,0.3)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '48px', flexShrink: 0,
                  }}>
                    ⚽
                  </div>
                </div>

                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr 72px 72px 72px 72px 72px 72px 82px 96px',
                  padding: '16px 72px',
                  background: 'rgba(0,0,0,0.25)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {['#', 'CLUB', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'].map((h, i) => (
                    <div key={h} style={{
                      fontSize: '15px', fontWeight: 800, letterSpacing: '0.1em',
                      color: i === 9 ? '#D6A848' : 'rgba(255,255,255,0.5)',
                      textAlign: i <= 1 ? 'left' : 'center',
                      textTransform: 'uppercase',
                    }}>{h}</div>
                  ))}
                </div>

                {/* Table rows */}
                <div style={{ flex: 1, padding: '0 72px', overflowY: 'hidden' }}>
                  {standings.map((row, i) => (
                    <div
                      key={row.team_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr 72px 72px 72px 72px 72px 72px 82px 96px',
                        padding: '14px 0',
                        borderBottom: i < standings.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                        background: i === 0 ? 'rgba(214,168,72,0.06)' : undefined,
                        borderLeft: i === 0 ? '4px solid #D6A848' : '4px solid transparent',
                        marginLeft: i === 0 ? '-4px' : '0',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '22px', color: i === 0 ? '#D6A848' : 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                        {i + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {row.shield_url ? (
                          <img src={row.shield_url} alt="" style={{ width: '46px', height: '46px', objectFit: 'contain' }} crossOrigin="anonymous" />
                        ) : (
                          <div style={{ width: '46px', height: '46px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                        )}
                        <span style={{ fontWeight: 700, fontSize: '22px', color: '#FFFFFF' }}>{row.club_name}</span>
                      </div>
                      {[row.PJ, row.PG, row.PE, row.PP, row.GF, row.GC].map((v, j) => (
                        <div key={j} style={{ textAlign: 'center', fontSize: '22px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{v}</div>
                      ))}
                      <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, color: row.DG > 0 ? '#20B26B' : row.DG < 0 ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                        {row.DG > 0 ? `+${row.DG}` : row.DG}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 900, color: '#D6A848' }}>{row.PTS}</div>
                    </div>
                  ))}
                </div>

                {/* Footer / Sponsor */}
                <div style={{
                  padding: '28px 72px',
                  background: 'rgba(0,0,0,0.35)',
                  borderTop: '2px solid rgba(214,168,72,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', gap: '32px' }}>
                    {[['🏆', '3 PTS'], ['🤝', '1 PT'], ['❌', '0 PTS']].map(([icon, label]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
                        <span>{icon}</span><span>{label}</span>
                      </div>
                    ))}
                  </div>
                  {sponsor ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sponsor</span>
                      <span style={{ fontWeight: 800, fontSize: '20px', color: '#D6A848' }}>{sponsor}</span>
                    </div>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', letterSpacing: '0.08em' }}>
                      ligariotres.vercel.app
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExportarPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>}>
      <ExportarContent />
    </Suspense>
  )
}
