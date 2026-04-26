import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const hoy = new Date().toISOString().split('T')[0]
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: ventasHoy, error: errHoy } = await supabase.rpc('reporte_ventas_periodo', {
    fecha_inicio: hoy,
    fecha_fin: hoy,
    p_caja_id: null,
  })
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

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {errHoy && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Aviso: {errHoy.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas hoy"
          value={fmt(totalHoy)}
          sub={`${cantidadHoy} transacciones`}
          color="emerald"
        />
        <KpiCard
          title="Últimos 7 días"
          value={fmt(total7d)}
          sub="Ingresos brutos"
          color="blue"
        />
        <KpiCard
          title="Insumos críticos"
          value={String(insumosCriticos.length)}
          sub="Stock por debajo del mínimo"
          color={insumosCriticos.length > 0 ? 'red' : 'gray'}
        />
        <KpiCard
          title="Ticket promedio"
          value={cantidadHoy > 0 ? fmt(totalHoy / cantidadHoy) : '—'}
          sub="Hoy"
          color="purple"
        />
      </div>

      {insumosCriticos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ Stock crítico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {insumosCriticos.slice(0, 6).map((i: any) => (
              <div key={i.id} className="flex justify-between bg-white rounded px-3 py-2">
                <span>{i.nombre}</span>
                <span className="font-mono">
                  {i.stock_actual} {i.unidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Ventas por método de pago (hoy)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Caja</th>
                <th className="text-left py-2">Método</th>
                <th className="text-right py-2">Cantidad</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(ventasHoy ?? []).map((r: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{r.caja_nombre}</td>
                  <td className="py-2">{r.metodo_pago}</td>
                  <td className="py-2 text-right">{r.num_ventas}</td>
                  <td className="py-2 text-right font-mono">{fmt(Number(r.total))}</td>
                </tr>
              ))}
              {(ventasHoy ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Sin ventas hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  color,
}: {
  title: string
  value: string
  sub: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    red: 'bg-red-50 text-red-900 border-red-200',
    purple: 'bg-purple-50 text-purple-900 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <div className={`border rounded-lg p-4 ${colorMap[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  )
}
