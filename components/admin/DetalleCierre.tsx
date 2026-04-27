'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  useEffect(() => {
    const fecha = new Date(cierre.created_at)
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    const hh = String(fecha.getHours()).padStart(2, '0')
    const mi = String(fecha.getMinutes()).padStart(2, '0')
    document.title = `Cierre-${cierre.caja?.nombre ?? 'caja'}-${yyyy}-${mm}-${dd}-${hh}${mi}`
  }, [cierre])

  const totalPorMetodo = Object.values(cierre.por_metodo_pago).reduce(
    (acc, v: any) => acc + Number(v.total),
    0
  )

  const volver = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/admin/cierres')
    }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Oculta absolutamente TODO lo que no sea el cierre */
          body * {
            visibility: hidden;
          }
          .cierre-print, .cierre-print * {
            visibility: visible;
          }
          .cierre-print {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            margin: 0 !important;
            padding: 1.2cm !important;
            max-width: 100% !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          /* Quitar header/footer del navegador requiere que el usuario lo configure
             pero al menos eliminamos URL en el contenido */
          @page {
            size: letter;
            margin: 1.2cm;
          }
        }

        @media screen {
          .cierre-print {
            background: white;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-4">
          {/* Toolbar (no se imprime) */}
          <div className="no-print mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🖨️ Imprimir / Guardar PDF
            </button>
            <button
              onClick={volver}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
            >
              ← Volver a cierres
            </button>
          </div>

          {/* Tip al usuario */}
          <div className="no-print bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
            💡 <strong>Tip:</strong> Al imprimir, en el diálogo del navegador
            despliega <strong>"Más opciones"</strong> y desactiva
            <strong> "Encabezados y pies de página"</strong> para que no salga la
            URL ni la fecha del navegador en el PDF.
          </div>

          <div className="cierre-print bg-white rounded-lg shadow-sm p-8">
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
                  <p className="text-xs text-gray-600 uppercase">
                    # Transacciones
                  </p>
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
                  {Object.entries(cierre.por_metodo_pago).map(
                    ([metodo, info]: any) => {
                      const total = Number(info.total)
                      const pct =
                        totalPorMetodo > 0
                          ? ((total / totalPorMetodo) * 100).toFixed(1)
                          : '0.0'
                      return (
                        <tr key={metodo} className="border-t">
                          <td className="py-2 px-3 border font-medium">
                            {metodo}
                          </td>
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
                    }
                  )}
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
                <h2 className="text-lg font-bold mb-2 text-gray-800">
                  Observaciones
                </h2>
                <p className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                  {cierre.observaciones}
                </p>
              </section>
            )}

            <footer className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
              Generado el {new Date(cierre.created_at).toLocaleString('es-CO')}
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}
