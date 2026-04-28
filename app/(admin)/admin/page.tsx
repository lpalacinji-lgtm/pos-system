import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/admin/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const hoy = new Date().toISOString().split('T')[0]
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: ventasHoy, error: errHoy } = await supabase.rpc(
    'reporte_ventas_periodo',
    {
      fecha_inicio: hoy,
      fecha_fin: hoy,
      p_caja_id: null,
    }
  )
  const { data: ventas7d } = await supabase.rpc('reporte_ventas_periodo', {
    fecha_inicio: haceUnaSemana,
    fecha_fin: hoy,
    p_caja_id: null,
  })

  const { data: insumosBajos } = await supabase
    .from('insumos')
    .select('id, codigo, nombre, stock_actual, stock_minimo, unidad')
    .eq('activo', true)
    .order('stock_actual')

  const totalHoy = (ventasHoy ?? []).reduce(
    (s: number, r: any) => s + Number(r.total || 0),
    0
  )
  const cantidadHoy = (ventasHoy ?? []).reduce(
    (s: number, r: any) => s + Number(r.num_ventas || 0),
    0
  )
  const total7d = (ventas7d ?? []).reduce(
    (s: number, r: any) => s + Number(r.total || 0),
    0
  )

  const insumosCriticos = (insumosBajos ?? []).filter(
    (i: any) => Number(i.stock_actual) <= Number(i.stock_minimo)
  )

  return (
    <DashboardClient
      totalHoy={totalHoy}
      cantidadHoy={cantidadHoy}
      total7d={total7d}
      insumosCriticos={insumosCriticos as any}
      ventasHoy={(ventasHoy ?? []) as any}
      errorMsg={errHoy?.message ?? null}
    />
  )
}
