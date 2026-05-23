'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category, Tournament } from '@/lib/types'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Category[]>([])
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ tournament_id: '', name: '', display_order: 0, color: '#20B26B', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: cats }, { data: tours }] = await Promise.all([
      supabase.from('categories').select('*, tournaments(name, year)').order('display_order'),
      supabase.from('tournaments').select('*').eq('status', 'active').order('year', { ascending: false }),
    ])
    setCategorias(cats ?? [])
    setTorneos(tours ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const openNew = () => {
    setEditing(null)
    setForm({ tournament_id: torneos[0]?.id ?? '', name: '', display_order: categorias.length, color: '#20B26B', active: true })
    setError('')
    setShowModal(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ tournament_id: c.tournament_id, name: c.name, display_order: c.display_order, color: c.color, active: c.active })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.tournament_id) { setError('Seleccioná un torneo.'); return }
    setSaving(true); setError('')

    const payload = { ...form, name: form.name.trim() }

    if (editing) {
      const { error: err } = await supabase.from('categories').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('categories').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  const handleDelete = async (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return
    await supabase.from('categories').delete().eq('id', c.id)
    fetchData()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{categorias.length} categoría{categorias.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva categoría</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : categorias.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            No hay categorías. Creá la primera.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Color</th>
                <th>Nombre</th>
                <th>Torneo</th>
                <th>Orden</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(c => {
                const torneo = Array.isArray(c.tournaments) ? c.tournaments[0] : c.tournaments
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.color, border: '2px solid #2a3a4a' }} />
                    </td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{c.name}</td>
                    <td style={{ color: '#94a3b8' }}>{torneo?.name} {torneo?.year}</td>
                    <td style={{ color: '#94a3b8' }}>{c.display_order}</td>
                    <td>
                      <span className={`badge ${c.active ? 'badge-green' : 'badge-gray'}`}>
                        {c.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn-danger" onClick={() => handleDelete(c)}>Eliminar</button>
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
            <h2 className="modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Torneo *</label>
                <select className="select" value={form.tournament_id} onChange={e => setForm(f => ({ ...f, tournament_id: e.target.value }))} required>
                  <option value="">Seleccioná un torneo</option>
                  {torneos.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre de la categoría *</label>
                <input className="input" placeholder='Ej: Primera "A"' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Orden de visualización</label>
                  <input className="input" type="number" min="0" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Color de acento</label>
                  <input className="input" type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ padding: '0.2rem', height: '42px', cursor: 'pointer' }} />
                </div>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="select" value={form.active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
