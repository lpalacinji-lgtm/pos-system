import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ComandaImprimible from '@/components/comanda/ComandaImprimible'

export const dynamic = 'force-dynamic'

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ ventaId: string }>
}) {
  const { ventaId } = await params
  const supabase = await createClient()

  const { data: venta } = await supabase
    .from('ventas')
    .select(
      `
      id, numero_consecutivo, created_at, estado,
      es_domicilio, direccion_entrega, observaciones,
      caja:cajas(nombre),
      cajera:profiles!ventas_cajera_id_fkey(nombre),
      cliente:clientes(nombre, telefono),
      items:venta_items(
        cantidad, observacion,
        producto:productos(codigo, nombre, tiempo_preparacion_min)
      )
    `
    )
    .eq('id', ventaId)
    .single()

  if (!venta) notFound()

  return <ComandaImprimible venta={venta as any} />
}
