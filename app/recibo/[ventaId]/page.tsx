import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReciboImprimible from '@/components/recibo/ReciboImprimible'

export const dynamic = 'force-dynamic'

export default async function ReciboPage({
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
      id, numero_consecutivo, created_at, subtotal, iva, descuento, total,
      metodo_pago, tipo_factura, es_domicilio, direccion_entrega, observaciones,
      caja:cajas(nombre, ubicacion),
      cajera:profiles!ventas_cajera_id_fkey(nombre),
      cliente:clientes(nit, nombre, telefono, direccion),
      items:venta_items(
        cantidad, precio_unitario, iva_porcentaje, subtotal, total,
        producto:productos(codigo, nombre)
      )
    `
    )
    .eq('id', ventaId)
    .single()

  if (!venta) notFound()

  return <ReciboImprimible venta={venta as any} />
}
