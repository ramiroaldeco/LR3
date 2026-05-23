'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Club } from '@/lib/types'

export default function ClubesPage() {
  const [clubes, setClubes] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Club | null>(null)
  const [form, setForm] = useState({ name: '', city: '', primary_color: '#FF0000', secondary_color: '#FFFFFF', notes: '' })
  const [shieldFile, setShieldFile] = useState<File | null>(null)
  const [shieldPreview, setShieldPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const fetchClubes = useCallback(async () => {
    const { data } = await supabase.from('clubs').select('*').order('name')
    setClubes(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchClubes() }, [fetchClubes])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', city: '', primary_color: '#FF0000', secondary_color: '#FFFFFF', notes: '' })
    setShieldFile(null); setShieldPreview(''); setError('')
    setShowModal(true)
  }

  const openEdit = (c: Club) => {
    setEditing(c)
    setForm({ name: c.name, city: c.city ?? '', primary_color: c.primary_color, secondary_color: c.secondary_color, notes: c.notes ?? '' })
    setShieldFile(null); setShieldPreview(c.shield_url ?? ''); setError('')
    setShowModal(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setShieldFile(file)
    setShieldPreview(URL.createObjectURL(file))
  }

  const uploadShield = async (clubId: string): Promise<string | null> => {
    if (!shieldFile) return null
    const ext = shieldFile.name.split('.').pop()
    const path = `shields/${clubId}.${ext}`
    const { error } = await supabase.storage.from('escudos').upload(path, shieldFile, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('escudos').getPublicUrl(path)
    return data.publicUrl + `?t=${Date.now()}`
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError('')

    if (editing) {
      let shield_url = editing.shield_url
      if (shieldFile) {
        const url = await uploadShield(editing.id)
        if (url) shield_url = url
      }
      const { error: err } = await supabase.from('clubs').update({ ...form, name: form.name.trim(), shield_url }).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { data: newClub, error: err } = await supabase.from('clubs').insert({ ...form, name: form.name.trim() }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      if (shieldFile && newClub) {
        const url = await uploadShield(newClub.id)
        if (url) await supabase.from('clubs').update({ shield_url: url }).eq('id', newClub.id)
      }
    }

    setSaving(false); setShowModal(false); fetchClubes()
  }

  const handleDelete = async (c: Club) => {
    if (!confirm(`¿Eliminar el club "${c.name}"? Se eliminarán todos sus equipos y datos asociados.`)) return
    if (c.shield_url) {
      const path = c.shield_url.split('/escudos/')[1]?.split('?')[0]
      if (path) await supabase.storage.from('escudos').remove([`shields/${path.split('shields/')[1]}`])
    }
    await supabase.from('clubs').delete().eq('id', c.id)
    fetchClubes()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clubes</h1>
          <p className="page-subtitle">{clubes.length} club{clubes.length !== 1 ? 'es' : ''} registrado{clubes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo club</button>
      </div>

      {/* Grid view */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
      ) : clubes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
          No hay clubes. Agregá el primero.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {clubes.map(c => (
            <div key={c.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
              {c.shield_url ? (
                <img src={c.shield_url} alt={c.name} style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', background: '#2a3a4a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🛡️</div>
              )}
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{c.name}</div>
                {c.city && <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.city}</div>}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.primary_color, border: '1px solid #2a3a4a' }} title={c.primary_color} />
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.secondary_color, border: '1px solid #2a3a4a' }} title={c.secondary_color} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }} onClick={() => openEdit(c)}>Editar</button>
                <button className="btn-danger" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => handleDelete(c)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? 'Editar club' : 'Nuevo club'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Shield upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="shield-upload-btn"
                >
                  {shieldPreview ? (
                    <img src={shieldPreview} alt="Shield" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                  )}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>Escudo del club</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>PNG, JPG o WebP. Hacé clic para subir.</div>
                  <button type="button" className="btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} onClick={() => fileRef.current?.click()}>
                    Elegir archivo
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              <div className="form-group">
                <label>Nombre del club *</label>
                <input className="input" placeholder="Ej: Independiente" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Localidad</label>
                <input className="input" placeholder="Ej: Hernando" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Color principal</label>
                  <input className="input" type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ padding: '0.2rem', height: '42px', cursor: 'pointer' }} />
                </div>
                <div className="form-group">
                  <label>Color secundario</label>
                  <input className="input" type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} style={{ padding: '0.2rem', height: '42px', cursor: 'pointer' }} />
                </div>
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea className="input" rows={2} placeholder="Notas opcionales..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
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
