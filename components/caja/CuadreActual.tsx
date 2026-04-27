'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cuadre = {
  desde: string
  hasta: string
  total_ventas: number
  cantidad_ventas: number
  cantidad_canceladas: number
  total_descuentos: number
  total_iva: number
  total_domicilios: number
  por_metodo_pago: Record<string, { total: number; cantidad: number }>
  detalle_items: Array<{
    producto: string
    codigo: string
    cantidad: number
    total: number
  }>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function CuadreActual({ cajaId }: { cajaId: string }) {
  const supabase = createClient()
  const [cuadre, setCuadre] = useState<Cuadre | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.rpc('cuadre_actual', {
      p_caja_id: cajaId,
    })
    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }
    setCuadre(data as any)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // Auto-refresh cada 30 segundos
    const t = setInterval(cargar, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line
  }, [cajaId])

  if (cargando && !cuadre) {
    return (
      <div className="p-8 text-center text-gray-400">
        Calculando cuadre...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!cuadre) return null

  const totalPorMetodo = Object.values(cuadre.por_metodo_pago).reduce(
    (acc, v: any) => acc + Number(v.total),
    0
  )

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Desde el último cierre · Actualizado {new Date().toLocaleTimeString('es-CO')}
        </p>
        <button
          onClick={cargar}
          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg"
        >
          🔄 Refrescar
        </button>
      </div>

      <p className="text-sm text-gray-700">
        Periodo: <strong>{new Date(cuadre.desde).toLocaleString('es-CO')}</strong>{' '}
        → <strong>ahora</strong>
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
          <p className="text-xs text-gray-600 uppercase">Total ventas</p>
          <p className="text-xl font-bold text-emerald-700">
            {fmt(Number(cuadre.total_ventas))}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-gray-600 uppercase"># Transacciones</p>
          <p className="text-xl font-bold text-blue-700">
            {cuadre.cantidad_ventas}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs text-gray-600 uppercase">IVA cobrado</p>
          <p className="text-xl font-bold text-amber-700">
            {fmt(Number(cuadre.total_iva))}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded p-3">
          <p className="text-xs text-gray-600 uppercase">Domicilios</p>
          <p className="text-xl font-bold text-orange-700">
            {fmt(Number(cuadre.total_domicilios))}
          </p>
        </div>
      </div>

      {/* Por método */}
      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b font-bold text-sm">
          Cobrado por método de pago
        </div>
        {totalPorMetodo === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">
            Aún no hay cobros desde el último cierre.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="text-left py-2 px-3">Método</th>
                <th className="text-right py-2 px-3">#</th>
                <th className="text-right py-2 px-3">Total</th>
                <th className="text-right py-2 px-3">% del total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cuadre.por_metodo_pago).map(
                ([metodo, info]: any) => {
                  const total = Number(info.total)
                  const pct =
                    totalPorMetodo > 0
                      ? ((total / totalPorMetodo) * 100).toFixed(1)
                      : '0.0'
                  return (
                    <tr key={metodo} className="border-t">
                      <td className="py-2 px-3 font-medium">{metodo}</td>
                      <td className="py-2 px-3 text-right">{info.cantidad}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {fmt(total)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        {pct}%
                      </td>
                    </tr>
                  )
                }
              )}
              <tr className="bg-gray-50 font-bold border-t-2">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right">{cuadre.cantidad_ventas}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {fmt(totalPorMetodo)}
                </td>
                <td className="py-2 px-3 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {/* Productos */}
      {cuadre.detalle_items.length > 0 && (
        <section className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b font-bold text-sm">
            Productos vendidos
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="text-left py-2 px-3">Código</th>
                <th className="text-left py-2 px-3">Producto</th>
                <th className="text-right py-2 px-3">Cant.</th>
                <th className="text-right py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {cuadre.detalle_items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 px-3 text-xs font-mono">{it.codigo}</td>
                  <td className="py-2 px-3">{it.producto}</td>
                  <td className="py-2 px-3 text-right">{it.cantidad}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {fmt(Number(it.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(cuadre.cantidad_canceladas > 0 ||
        Number(cuadre.total_descuentos) > 0) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {cuadre.cantidad_canceladas > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <strong>Canceladas:</strong> {cuadre.cantidad_canceladas}
            </div>
          )}
          {Number(cuadre.total_descuentos) > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <strong>Descuentos:</strong>{' '}
              {fmt(Number(cuadre.total_descuentos))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-center text-gray-500 italic">
        Solo el ADMIN puede cerrar la caja para generar el reporte definitivo.
      </p>
    </main>
  )
}
