'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Match, Round, Team, Club } from '@/lib/types'

type MatchWithTeams = Match & {
  home_team: Team & { clubs: Club }
  away_team: Team & { clubs: Club }
}

export default function FechaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const roundId = params.id as string
  const supabase = createClient()

  const [round, setRound] = useState<Round | null>(null)
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [teams, setTeams] = useState<(Team & { clubs: Club })[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchWithTeams | null>(null)
  const [form, setForm] = useState({ home_team_id: '', away_team_id: '', home_goals: '', away_goals: '', status: 'pending', match_date: '', match_time: '', field: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    const [{ data: r }, { data: ms }] = await Promise.all([
      supabase.from('rounds').select('*, tournaments(name,year), categories(name)').eq('id', roundId).single(),
      supabase.from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*, clubs(*)), away_team:teams!matches_away_team_id_fkey(*, clubs(*))').eq('round_id', roundId).order('created_at'),
    ])
    setRound(r)
    setMatches(ms ?? [])

    if (r) {
      const { data: ts } = await supabase.from('teams').select('*, clubs(*)').eq('tournament_id', r.tournament_id).eq('category_id', r.category_id).eq('active', true)
      setTeams(ts ?? [])
    }
    setLoading(false)
  }, [supabase, roundId])

  useEffect(() => { fetchData() }, [fetchData])

  const openNew = () => {
    setEditingMatch(null)
    setForm({ home_team_id: '', away_team_id: '', home_goals: '', away_goals: '', status: 'pending', match_date: '', match_time: '', field: '', notes: '' })
    setError(''); setShowModal(true)
  }

  const openEdit = (m: MatchWithTeams) => {
    setEditingMatch(m)
    setForm({
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_goals: m.home_goals !== null ? String(m.home_goals) : '',
      away_goals: m.away_goals !== null ? String(m.away_goals) : '',
      status: m.status,
      match_date: m.match_date ?? '',
      match_time: m.match_time ?? '',
      field: m.field ?? '',
      notes: m.notes ?? '',
    })
    setError(''); setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.home_team_id || !form.away_team_id) { setError('Seleccioná ambos equipos.'); return }
    if (form.home_team_id === form.away_team_id) { setError('Un equipo no puede jugar contra sí mismo.'); return }
    if (form.status === 'finished') {
      if (form.home_goals === '' || form.away_goals === '') { setError('Cargá los goles para finalizar el partido.'); return }
    }
    if (form.home_goals !== '' && parseInt(form.home_goals) < 0) { setError('Los goles no pueden ser negativos.'); return }
    if (form.away_goals !== '' && parseInt(form.away_goals) < 0) { setError('Los goles no pueden ser negativos.'); return }

    setSaving(true); setError('')

    const payload = {
      tournament_id: round!.tournament_id,
      category_id: round!.category_id,
      round_id: roundId,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      home_goals: form.home_goals !== '' ? parseInt(form.home_goals) : null,
      away_goals: form.away_goals !== '' ? parseInt(form.away_goals) : null,
      status: form.status,
      match_date: form.match_date || null,
      match_time: form.match_time || null,
      field: form.field.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editingMatch) {
      const { error: err } = await supabase.from('matches').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingMatch.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('matches').insert(payload)
      if (err) {
        if (err.code === '23505') setError('Ya existe un partido entre estos equipos en esta fecha.')
        else setError(err.message)
        setSaving(false); return
      }
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  const handleDelete = async (m: MatchWithTeams) => {
    const h = m.home_team?.clubs?.name ?? '?'
    const a = m.away_team?.clubs?.name ?? '?'
    if (!confirm(`¿Eliminar el partido ${h} vs ${a}?`)) return
    await supabase.from('matches').delete().eq('id', m.id)
    fetchData()
  }

  const statusLabel: Record<string, string> = { pending: 'Pendiente', finished: 'Finalizado', suspended: 'Suspendido', postponed: 'Postergado' }
  const statusClass: Record<string, string> = { pending: 'badge-gray', finished: 'badge-green', suspended: 'badge-red', postponed: 'badge-yellow' }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
  if (!round) return <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>Fecha no encontrada.</div>

  const tour = Array.isArray(round.tournaments) ? round.tournaments[0] : round.tournaments
  const cat = Array.isArray(round.categories) ? round.categories[0] : round.categories

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn-secondary" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }} onClick={() => router.push('/fechas')}>← Volver a fechas</button>
          <h1 className="page-title">Fecha {round.number}{round.name ? ` — ${round.name}` : ''}</h1>
          <p className="page-subtitle">{(cat as { name: string })?.name} · {(tour as { name: string; year: number })?.name} {(tour as { name: string; year: number })?.year}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => router.push(`/tabla?round=${round.id}`)}>Ver tabla hasta esta fecha</button>
          <button className="btn-primary" onClick={openNew}>+ Agregar partido</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {matches.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚽</div>
            No hay partidos en esta fecha. Agregá el primero.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Local</th>
                <th style={{ textAlign: 'center' }}>Resultado</th>
                <th>Visitante</th>
                <th>Estado</th>
                <th>Cancha</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {m.home_team?.clubs?.shield_url && <img src={m.home_team.clubs.shield_url} alt="" className="shield-img" />}
                      <span style={{ fontWeight: 600, color: '#fff' }}>{m.home_team?.clubs?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {m.status === 'finished' ? (
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.1em' }}>
                        {m.home_goals} — {m.away_goals}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>vs</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {m.away_team?.clubs?.shield_url && <img src={m.away_team.clubs.shield_url} alt="" className="shield-img" />}
                      <span style={{ fontWeight: 600, color: '#fff' }}>{m.away_team?.clubs?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${statusClass[m.status]}`}>{statusLabel[m.status]}</span></td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{m.field ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => openEdit(m)}>Editar</button>
                    <button className="btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => handleDelete(m)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingMatch ? 'Editar partido' : 'Nuevo partido'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Equipo local *</label>
                  <select className="select" value={form.home_team_id} onChange={e => setForm(f => ({ ...f, home_team_id: e.target.value }))} required>
                    <option value="">Seleccioná</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.clubs?.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Equipo visitante *</label>
                  <select className="select" value={form.away_team_id} onChange={e => setForm(f => ({ ...f, away_team_id: e.target.value }))} required>
                    <option value="">Seleccioná</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.clubs?.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pendiente</option>
                    <option value="finished">Finalizado</option>
                    <option value="suspended">Suspendido</option>
                    <option value="postponed">Postergado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cancha</label>
                  <input className="input" placeholder="Nombre de la cancha" value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))} />
                </div>
              </div>

              {(form.status === 'finished') && (
                <div style={{ background: 'rgba(32,178,107,0.07)', border: '1px solid rgba(32,178,107,0.2)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', color: '#20B26B', fontWeight: 600, fontSize: '0.875rem' }}>Resultado final</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Goles local</label>
                      <input className="input" type="number" min="0" placeholder="0" value={form.home_goals} onChange={e => setForm(f => ({ ...f, home_goals: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Goles visitante</label>
                      <input className="input" type="number" min="0" placeholder="0" value={form.away_goals} onChange={e => setForm(f => ({ ...f, away_goals: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha</label>
                  <input className="input" type="date" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Horario</label>
                  <input className="input" type="time" value={form.match_time} onChange={e => setForm(f => ({ ...f, match_time: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Observaciones</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
