'use client'

import { useEffect } from 'react'

type Cierre = {
  id: string
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
  observaciones: string | null
  created_at: string
  caja: { nombre: string; ubicacion: string | null } | null
  cerrado_por_profile: { nombre: string } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function DetalleCierre({ cierre }: { cierre: Cierre }) {
  useEffect(() => {
    const fecha = new Date(cierre.created_at)
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    document.title = `Cierre-${cierre.caja?.nombre ?? ''}-${yyyy}-${mm}-${dd}`
  }, [cierre])

  const totalPorMetodo = Object.values(cierre.por_metodo_pago).reduce(
    (acc, v: any) => acc + Number(v.total),
    0
  )

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
        @page {
          size: letter;
          margin: 1.5cm;
        }
      `}</style>

      <div className="max-w-3xl mx-auto p-6 bg-white">
        <div className="no-print mb-4 flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            🖨️ Imprimir / Guardar PDF
          </button>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>

        <header className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold">CIERRE DE CAJA</h1>
          <p className="text-lg text-gray-700 mt-1">
            {cierre.caja?.nombre ?? '—'}
            {cierre.caja?.ubicacion && ` · ${cierre.caja.ubicacion}`}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
            <span>
              <strong>Desde:</strong>{' '}
              {new Date(cierre.desde).toLocaleString('es-CO')}
            </span>
            <span>
              <strong>Hasta:</strong>{' '}
              {new Date(cierre.hasta).toLocaleString('es-CO')}
            </span>
            <span>
              <strong>Cerrado por:</strong>{' '}
              {cierre.cerrado_por_profile?.nombre ?? '—'}
            </span>
          </div>
        </header>

        {/* Resumen */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">Resumen</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
              <p className="text-xs text-gray-600 uppercase">Total ventas</p>
              <p className="text-xl font-bold text-emerald-700">
                {fmt(Number(cierre.total_ventas))}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-gray-600 uppercase"># Transacciones</p>
              <p className="text-xl font-bold text-blue-700">
                {cierre.cantidad_ventas}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-xs text-gray-600 uppercase">IVA cobrado</p>
              <p className="text-xl font-bold text-amber-700">
                {fmt(Number(cierre.total_iva))}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <p className="text-xs text-gray-600 uppercase">Domicilios</p>
              <p className="text-xl font-bold text-orange-700">
                {fmt(Number(cierre.total_domicilios))}
              </p>
            </div>
          </div>
          {(cierre.cantidad_canceladas > 0 ||
            Number(cierre.total_descuentos) > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              {cierre.cantidad_canceladas > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <strong>Canceladas:</strong> {cierre.cantidad_canceladas}
                </div>
              )}
              {Number(cierre.total_descuentos) > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded p-2">
                  <strong>Descuentos:</strong>{' '}
                  {fmt(Number(cierre.total_descuentos))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Por método de pago */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">
            Cobrado por método de pago
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-3 border">Método</th>
                <th className="text-right py-2 px-3 border">#</th>
                <th className="text-right py-2 px-3 border">Total</th>
                <th className="text-right py-2 px-3 border">% del total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cierre.por_metodo_pago).map(([metodo, info]: any) => {
                const total = Number(info.total)
                const pct =
                  totalPorMetodo > 0
                    ? ((total / totalPorMetodo) * 100).toFixed(1)
                    : '0.0'
                return (
                  <tr key={metodo} className="border-t">
                    <td className="py-2 px-3 border font-medium">{metodo}</td>
                    <td className="py-2 px-3 border text-right">
                      {info.cantidad}
                    </td>
                    <td className="py-2 px-3 border text-right tabular-nums">
                      {fmt(total)}
                    </td>
                    <td className="py-2 px-3 border text-right text-gray-600">
                      {pct}%
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-gray-100 font-bold">
                <td className="py-2 px-3 border">TOTAL</td>
                <td className="py-2 px-3 border text-right">
                  {cierre.cantidad_ventas}
                </td>
                <td className="py-2 px-3 border text-right tabular-nums">
                  {fmt(totalPorMetodo)}
                </td>
                <td className="py-2 px-3 border text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Productos vendidos */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">
            Productos vendidos
          </h2>
          {cierre.detalle_items.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin productos.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 border">Código</th>
                  <th className="text-left py-2 px-3 border">Producto</th>
                  <th className="text-right py-2 px-3 border">Cant.</th>
                  <th className="text-right py-2 px-3 border">Total</th>
                </tr>
              </thead>
              <tbody>
                {cierre.detalle_items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 px-3 border text-xs font-mono">
                      {it.codigo}
                    </td>
                    <td className="py-2 px-3 border">{it.producto}</td>
                    <td className="py-2 px-3 border text-right">
                      {it.cantidad}
                    </td>
                    <td className="py-2 px-3 border text-right tabular-nums">
                      {fmt(Number(it.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {cierre.observaciones && (
          <section className="mb-6">
            <h2 className="text-lg font-bold mb-2 text-gray-800">Observaciones</h2>
            <p className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
              {cierre.observaciones}
            </p>
          </section>
        )}

        <footer className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
          Generado el {new Date(cierre.created_at).toLocaleString('es-CO')}
        </footer>
      </div>
    </>
  )
}
