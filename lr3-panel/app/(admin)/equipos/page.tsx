'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Club, Category, Tournament, Team } from '@/lib/types'

export default function EquiposPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [clubes, setClubes] = useState<Club[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ club_id: '', category_id: '', tournament_id: '', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterTorneo, setFilterTorneo] = useState('')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: ts }, { data: cls }, { data: cats }, { data: tours }] = await Promise.all([
      supabase.from('teams').select('*, clubs(name, shield_url), categories(name), tournaments(name, year)').order('created_at'),
      supabase.from('clubs').select('*').order('name'),
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('tournaments').select('*').order('year', { ascending: false }),
    ])
    setTeams(ts ?? []); setClubes(cls ?? []); setCategorias(cats ?? []); setTorneos(tours ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredCats = categorias.filter(c => !form.tournament_id || c.tournament_id === form.tournament_id)

  const openNew = () => {
    setForm({ club_id: '', category_id: '', tournament_id: torneos[0]?.id ?? '', active: true })
    setError(''); setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.club_id || !form.category_id || !form.tournament_id) { setError('Completá todos los campos.'); return }
    setSaving(true); setError('')

    const { error: err } = await supabase.from('teams').insert(form)
    if (err) {
      if (err.code === '23505') setError('Este club ya está inscripto en esa categoría para ese torneo.')
      else setError(err.message)
      setSaving(false); return
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  const handleDelete = async (t: Team) => {
    const club = Array.isArray(t.clubs) ? t.clubs[0] : t.clubs
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories
    if (!confirm(`¿Quitar a ${club?.name} de ${cat?.name}?`)) return
    await supabase.from('teams').delete().eq('id', t.id)
    fetchData()
  }

  const displayTeams = filterTorneo ? teams.filter(t => t.tournament_id === filterTorneo) : teams

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipos por categoría</h1>
          <p className="page-subtitle">Inscripción de clubes en torneos y categorías</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Inscribir equipo</button>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <select className="select" style={{ maxWidth: '300px' }} value={filterTorneo} onChange={e => setFilterTorneo(e.target.value)}>
          <option value="">Todos los torneos</option>
          {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : displayTeams.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
            No hay equipos inscriptos.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Club</th>
                <th>Categoría</th>
                <th>Torneo</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayTeams.map(t => {
                const club = Array.isArray(t.clubs) ? t.clubs[0] : t.clubs
                const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories
                const tour = Array.isArray(t.tournaments) ? t.tournaments[0] : t.tournaments
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {(club as Club)?.shield_url ? (
                          <img src={(club as Club).shield_url!} alt="" className="shield-img" />
                        ) : (
                          <div className="shield-placeholder">🛡️</div>
                        )}
                        <span style={{ fontWeight: 600, color: '#fff' }}>{(club as Club)?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{(cat as Category)?.name ?? '—'}</td>
                    <td style={{ color: '#94a3b8' }}>{(tour as Tournament)?.name} {(tour as Tournament)?.year}</td>
                    <td><span className={`badge ${t.active ? 'badge-green' : 'badge-gray'}`}>{t.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-danger" onClick={() => handleDelete(t)}>Quitar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Inscribir equipo</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Torneo *</label>
                <select className="select" value={form.tournament_id} onChange={e => setForm(f => ({ ...f, tournament_id: e.target.value, category_id: '' }))} required>
                  <option value="">Seleccioná un torneo</option>
                  {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Categoría *</label>
                <select className="select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Seleccioná una categoría</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Club *</label>
                <select className="select" value={form.club_id} onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))} required>
                  <option value="">Seleccioná un club</option>
                  {clubes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Inscribir'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
