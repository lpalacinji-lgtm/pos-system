import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PantallaCocina from '@/components/cocina/PantallaCocina'

export const dynamic = 'force-dynamic'

export default async function CocinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre').eq('id', user.id).single()
  if (!profile || !['COCINA', 'ADMIN'].includes(profile.rol)) redirect('/')

  const { data: pedidos } = await supabase
    .from('ventas')
    .select(
      `id, numero_consecutivo, estado, created_at, es_domicilio, observaciones,
       caja:cajas(nombre),
       cajera:profiles!ventas_cajera_id_fkey(nombre),
       cliente:clientes(nombre),
       items:venta_items(id, cantidad, observacion, producto:productos(nombre, tiempo_preparacion_min))`
    )
    .in('estado', ['EN_COCINA', 'LISTO'])
    .order('created_at', { ascending: true })

  return (
    <PantallaCocina
      pedidosIniciales={(pedidos ?? []) as any}
      nombre={profile.nombre}
    />
  )
}
