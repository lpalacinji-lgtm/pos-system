import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DomicilioModule from '@/components/domicilio/DomicilioModule'
import HeaderDomi from '@/components/domicilio/HeaderDomi'

export const dynamic = 'force-dynamic'

export default async function DomicilioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre').eq('id', user.id).single()
  if (!profile || !['DOMICILIARIO', 'ADMIN'].includes(profile.rol)) redirect('/')

  // Query 1: pedidos LISTO sin asignar (disponibles para tomar)
  const { data: disponibles } = await supabase
    .from('ventas')
    .select(
      `id, numero_consecutivo, estado, direccion_entrega, total, metodo_pago,
       created_at, listo_at, en_ruta_at, domiciliario_id, es_domicilio,
       cliente:clientes(nombre, telefono)`
    )
    .eq('es_domicilio', true)
    .eq('estado', 'LISTO')
    .is('domiciliario_id', null)

  // Query 2: pedidos asignados a mí (LISTO o EN_RUTA)
  const { data: mios } = await supabase
    .from('ventas')
    .select(
      `id, numero_consecutivo, estado, direccion_entrega, total, metodo_pago,
       created_at, listo_at, en_ruta_at, domiciliario_id, es_domicilio,
       cliente:clientes(nombre, telefono)`
    )
    .eq('es_domicilio', true)
    .in('estado', ['LISTO', 'EN_RUTA'])
    .eq('domiciliario_id', user.id)

  // Combinar sin duplicados
  const todos = [...(disponibles ?? []), ...(mios ?? [])]
  const pedidos = Array.from(new Map(todos.map((p: any) => [p.id, p])).values())

  return (
    <>
      <HeaderDomi nombre={profile.nombre} />
      <DomicilioModule
        pedidosIniciales={pedidos as any}
        userId={user.id}
      />
    </>
  )
}
