'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tournament } from '@/lib/types'

export default function TorneosPage() {
  const [torneos, setTorneos] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Tournament | null>(null)
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), status: 'active', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchTorneos = useCallback(async () => {
    const { data } = await supabase.from('tournaments').select('*').order('year', { ascending: false }).order('name')
    setTorneos(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTorneos() }, [fetchTorneos])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', year: new Date().getFullYear(), status: 'active', start_date: '', end_date: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (t: Tournament) => {
    setEditing(t)
    setForm({ name: t.name, year: t.year, status: t.status, start_date: t.start_date ?? '', end_date: t.end_date ?? '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      year: form.year,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }

    if (editing) {
      const { error: err } = await supabase.from('tournaments').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('tournaments').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setShowModal(false)
    fetchTorneos()
  }

  const handleDelete = async (t: Tournament) => {
    if (!confirm(`¿Eliminar el torneo "${t.name}"? Se eliminarán todas las categorías, fechas y partidos asociados.`)) return
    await supabase.from('tournaments').delete().eq('id', t.id)
    fetchTorneos()
  }

  const statusLabel: Record<string, string> = { active: 'Activo', finished: 'Finalizado' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Torneos</h1>
          <p className="page-subtitle">{torneos.length} torneo{torneos.length !== 1 ? 's' : ''} registrado{torneos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo torneo</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : torneos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
            No hay torneos. Creá el primero.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Año</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {torneos.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{t.name}</td>
                  <td style={{ color: '#94a3b8' }}>{t.year}</td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {statusLabel[t.status]}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{t.start_date ? new Date(t.start_date + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                  <td style={{ color: '#94a3b8' }}>{t.end_date ? new Date(t.end_date + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openEdit(t)}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDelete(t)}>Eliminar</button>
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
            <h2 className="modal-title">{editing ? 'Editar torneo' : 'Nuevo torneo'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombre del torneo *</label>
                <input className="input" placeholder="Ej: Apertura 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Año *</label>
                  <input className="input" type="number" min="2000" max="2100" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} required />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Activo</option>
                    <option value="finished">Finalizado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de inicio</label>
                  <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Fecha de fin</label>
                  <input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
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
