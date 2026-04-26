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
      valor_domicilio, metodo_pago, tipo_factura, es_domicilio, direccion_entrega,
      observaciones, cufe, qr_url,
      caja:cajas(nombre, ubicacion),
      cajera:profiles!ventas_cajera_id_fkey(nombre),
      domiciliario:profiles!ventas_domiciliario_id_fkey(nombre, telefono),
      cliente:clientes(nit, nombre, telefono, direccion),
      items:venta_items(
        cantidad, precio_unitario, iva_porcentaje, subtotal, total, observacion,
        producto:productos(codigo, nombre)
      )
    `
    )
    .eq('id', ventaId)
    .single()

  if (!venta) notFound()

  return <ReciboImprimible venta={venta as any} />
}
