import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const fmtCOP = (n: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(n)

export default async function AuditoriaPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  const { data: movs } = await supabase
    .from('movimientos_bodega')
    .select(
      `id, tipo, cantidad, costo_unitario, stock_resultante, motivo, created_at,
       insumo:insumos(codigo, nombre, unidad),
       usuario:profiles(nombre)`
    )
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Auditoría de Bodega</h1>
        <p className="text-slate-500">Últimos 500 movimientos · trazabilidad completa</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Tipo</th>
              <th className="py-2 px-3">Insumo</th>
              <th className="py-2 px-3 text-right">Cantidad</th>
              <th className="py-2 px-3 text-right">Stock resultante</th>
              <th className="py-2 px-3 text-right">Costo unit.</th>
              <th className="py-2 px-3">Usuario</th>
              <th className="py-2 px-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(movs ?? []).map((m: any) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 text-xs text-slate-600">
                  {new Date(m.created_at).toLocaleString('es-CO')}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      m.tipo === 'ENTRADA'
                        ? 'bg-emerald-100 text-emerald-700'
                        : m.tipo === 'VENTA' || m.tipo === 'SALIDA'
                        ? 'bg-blue-100 text-blue-700'
                        : m.tipo === 'MERMA'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {m.tipo}
                  </span>
                </td>
                <td className="py-2 px-3 text-sm">
                  <span className="font-mono text-xs text-slate-500">{m.insumo?.codigo}</span>{' '}
                  <span className="font-medium">{m.insumo?.nombre}</span>
                </td>
                <td
                  className={`py-2 px-3 text-right tabular-nums font-semibold ${
                    Number(m.cantidad) >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {Number(m.cantidad) >= 0 ? '+' : ''}
                  {Number(m.cantidad)} {m.insumo?.unidad}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {Number(m.stock_resultante)} {m.insumo?.unidad}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                  {fmtCOP(m.costo_unitario)}
                </td>
                <td className="py-2 px-3 text-sm text-slate-600">{m.usuario?.nombre ?? '—'}</td>
                <td className="py-2 px-3 text-sm text-slate-600">{m.motivo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
