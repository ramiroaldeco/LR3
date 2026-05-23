import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Validate env vars early
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0B0F12', padding: '2rem', fontFamily: 'monospace',
      }}>
        <div style={{
          background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '12px',
          padding: '2rem', maxWidth: '600px', width: '100%',
        }}>
          <div style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
            ⚠️ Variables de entorno faltantes
          </div>
          <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>
            El panel no puede conectarse a Supabase porque faltan las variables de entorno.
          </p>
          <div style={{ background: '#0B0F12', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Agregá estas variables en Vercel → Settings → Environment Variables:</p>
            <code style={{ display: 'block', color: '#20B26B', fontSize: '0.85rem', lineHeight: 1.8 }}>
              NEXT_PUBLIC_SUPABASE_URL<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
            Después de agregar las variables, hacé un nuevo deploy en Vercel.
          </p>
        </div>
      </div>
    )
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  } catch {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '2rem',
        minHeight: '100vh',
        background: '#111827',
      }}>
        {children}
      </main>
    </div>
  )
}
