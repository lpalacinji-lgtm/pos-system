import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PantallaCocina from '@/components/cocina/PantallaCocina'
import LogoutButton from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function CocinaPage() {
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
  if (profile.rol !== 'COCINA' && profile.rol !== 'ADMIN') redirect('/')

  // Carga inicial: pedidos EN_COCINA o LISTO de hoy
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const { data: pedidosIniciales } = await supabase
    .from('ventas')
    .select(
      `
      id,
      numero_consecutivo,
      estado,
      es_domicilio,
      direccion_entrega,
      created_at,
      cocina_at,
      listo_at,
      caja:cajas(nombre),
      cliente:clientes(nombre, telefono),
      items:venta_items(id, cantidad, observacion, producto:productos(nombre, tiempo_preparacion_min))
    `
    )
    .in('estado', ['EN_COCINA', 'LISTO'])
    .gte('created_at', hoy.toISOString())
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold">🍳 Pantalla de Cocina</h1>
          <p className="text-sm text-slate-400">{profile.nombre} · {new Date().toLocaleDateString('es-CO')}</p>
        </div>
        <LogoutButton className="bg-slate-700 hover:bg-slate-600" />
      </header>
      <PantallaCocina pedidosIniciales={(pedidosIniciales ?? []) as any} />
    </div>
  )
}
