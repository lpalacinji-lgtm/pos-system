import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DomicilioModule from '@/components/domicilio/DomicilioModule'
import LogoutButton from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function DomicilioPage() {
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
  if (profile.rol !== 'DOMICILIARIO' && profile.rol !== 'ADMIN') redirect('/')

  // Pedidos LISTOS (sin asignar) + asignados a mí (EN_RUTA)
  const { data: pedidos } = await supabase
    .from('ventas')
    .select(
      `
      id, numero_consecutivo, estado, direccion_entrega, total, metodo_pago,
      created_at, listo_at, en_ruta_at, domiciliario_id,
      cliente:clientes(nombre, telefono)
    `
    )
    .eq('es_domicilio', true)
    .in('estado', ['LISTO', 'EN_RUTA'])
    .or(`domiciliario_id.is.null,domiciliario_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div>
          <h1 className="text-lg font-bold">🛵 Domicilios</h1>
          <p className="text-xs opacity-80">{profile.nombre}</p>
        </div>
        <LogoutButton className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5" />
      </header>
      <DomicilioModule
        pedidosIniciales={(pedidos ?? []) as any}
        userId={user.id}
      />
    </div>
  )
}
