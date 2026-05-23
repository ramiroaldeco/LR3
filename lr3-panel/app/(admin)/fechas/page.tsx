'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Round, Tournament, Category } from '@/lib/types'

export default function FechasPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Round | null>(null)
  const [form, setForm] = useState({ tournament_id: '', category_id: '', number: 1, name: '', status: 'pending', calendar_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterTorneo, setFilterTorneo] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: rs }, { data: ts }, { data: cs }] = await Promise.all([
      supabase.from('rounds').select('*, tournaments(name,year), categories(name)').order('number'),
      supabase.from('tournaments').select('*').order('year', { ascending: false }),
      supabase.from('categories').select('*').order('display_order'),
    ])
    setRounds(rs ?? []); setTorneos(ts ?? []); setCategorias(cs ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredCats = categorias.filter(c => !form.tournament_id || c.tournament_id === form.tournament_id)
  const displayCats = categorias.filter(c => !filterTorneo || c.tournament_id === filterTorneo)
  const displayRounds = rounds.filter(r =>
    (!filterTorneo || r.tournament_id === filterTorneo) &&
    (!filterCat || r.category_id === filterCat)
  )

  const openNew = () => {
    setEditing(null)
    const nextNum = displayRounds.length > 0 ? Math.max(...displayRounds.map(r => r.number)) + 1 : 1
    setForm({ tournament_id: torneos[0]?.id ?? '', category_id: '', number: nextNum, name: '', status: 'pending', calendar_date: '' })
    setError(''); setShowModal(true)
  }

  const openEdit = (r: Round) => {
    setEditing(r)
    setForm({ tournament_id: r.tournament_id, category_id: r.category_id, number: r.number, name: r.name ?? '', status: r.status, calendar_date: r.calendar_date ?? '' })
    setError(''); setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tournament_id || !form.category_id) { setError('Completá torneo y categoría.'); return }
    setSaving(true); setError('')

    const payload = { ...form, name: form.name.trim() || null, calendar_date: form.calendar_date || null }

    if (editing) {
      const { error: err } = await supabase.from('rounds').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('rounds').insert(payload)
      if (err) {
        if (err.code === '23505') setError('Ya existe esa fecha en esta categoría.')
        else setError(err.message)
        setSaving(false); return
      }
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  const handleDelete = async (r: Round) => {
    if (!confirm(`¿Eliminar la Fecha ${r.number}? Se eliminarán todos sus partidos.`)) return
    await supabase.from('rounds').delete().eq('id', r.id)
    fetchData()
  }

  const statusLabel: Record<string, string> = { pending: 'Pendiente', playing: 'En juego', finished: 'Finalizada' }
  const statusClass: Record<string, string> = { pending: 'badge-gray', playing: 'badge-yellow', finished: 'badge-green' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fechas</h1>
          <p className="page-subtitle">{displayRounds.length} fecha{displayRounds.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva fecha</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select className="select" style={{ maxWidth: '220px' }} value={filterTorneo} onChange={e => { setFilterTorneo(e.target.value); setFilterCat('') }}>
          <option value="">Todos los torneos</option>
          {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
        </select>
        <select className="select" style={{ maxWidth: '220px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {displayCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : displayRounds.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
            No hay fechas. Creá la primera.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Torneo</th>
                <th>Estado</th>
                <th>Fecha calendario</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayRounds.map(r => {
                const tour = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments
                const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      Fecha {r.number}{r.name ? ` — ${r.name}` : ''}
                    </td>
                    <td style={{ color: '#94a3b8' }}>{(cat as Category)?.name}</td>
                    <td style={{ color: '#94a3b8' }}>{(tour as Tournament)?.name}</td>
                    <td><span className={`badge ${statusClass[r.status]}`}>{statusLabel[r.status]}</span></td>
                    <td style={{ color: '#94a3b8' }}>{r.calendar_date ? new Date(r.calendar_date + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => router.push(`/fechas/${r.id}`)}>Ver partidos</button>
                      <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => openEdit(r)}>Editar</button>
                      <button className="btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => handleDelete(r)}>Eliminar</button>
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
            <h2 className="modal-title">{editing ? 'Editar fecha' : 'Nueva fecha'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Torneo *</label>
                <select className="select" value={form.tournament_id} onChange={e => setForm(f => ({ ...f, tournament_id: e.target.value, category_id: '' }))} required>
                  <option value="">Seleccioná</option>
                  {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Categoría *</label>
                <select className="select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Seleccioná</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Número de fecha *</label>
                  <input className="input" type="number" min="1" value={form.number} onChange={e => setForm(f => ({ ...f, number: parseInt(e.target.value) }))} required />
                </div>
                <div className="form-group">
                  <label>Nombre (opcional)</label>
                  <input className="input" placeholder="Ej: Jornada de apertura" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pendiente</option>
                    <option value="playing">En juego</option>
                    <option value="finished">Finalizada</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha calendario</label>
                  <input className="input" type="date" value={form.calendar_date} onChange={e => setForm(f => ({ ...f, calendar_date: e.target.value }))} />
                </div>
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
