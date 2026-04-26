import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BodegaModule from '@/components/bodega/BodegaModule'
import LogoutButton from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function BodegaPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre, activo')
    .eq('id', user.id)
    .single()

  if (!profile?.activo) redirect('/login?error=inactive')
  if (profile.rol !== 'BODEGA' && profile.rol !== 'ADMIN') redirect('/')

  const { data: insumos } = await supabase
    .from('insumos')
    .select('*')
    .order('nombre', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 Bodega</h1>
          <p className="text-sm text-slate-500">{profile.nombre}</p>
        </div>
        <LogoutButton />
      </header>
      <main className="p-6">
        <BodegaModule insumosIniciales={insumos ?? []} />
      </main>
    </div>
  )
}
