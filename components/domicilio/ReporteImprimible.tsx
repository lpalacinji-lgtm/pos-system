'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

function getRango(tipo: string, desdeCustom?: string, hastaCustom?: string) {
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)

  if (tipo === 'hoy') return { desde: hoy, hasta: manana }
  if (tipo === 'semana') {
    const desde = new Date(hoy)
    desde.setDate(hoy.getDate() - 6)
    return { desde, hasta: manana }
  }
  if (tipo === 'mes') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    return { desde, hasta }
  }
  // custom
  const desde = desdeCustom ? new Date(desdeCustom) : hoy
  const hasta = hastaCustom
    ? new Date(new Date(hastaCustom).getTime() + 24 * 60 * 60 * 1000)
    : manana
  return { desde, hasta }
}

export default function ReporteImprimible({
  nombre,
  tipo,
  desdeCustom,
  hastaCustom,
}: {
  nombre: string
  tipo: string
  desdeCustom?: string
  hastaCustom?: string
}) {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { desde, hasta } = getRango(tipo, desdeCustom, hastaCustom)
      const { data: rep } = await supabase.rpc('reporte_domiciliario', {
        p_desde: desde.toISOString(),
        p_hasta: hasta.toISOString(),
      })
      setData(rep)
      setCargando(false)

      const fecha = new Date()
      const yyyy = fecha.getFullYear()
      const mm = String(fecha.getMonth() + 1).padStart(2, '0')
      const dd = String(fecha.getDate()).padStart(2, '0')
      document.title = `Reporte-${nombre.replace(/\s+/g, '_')}-${yyyy}-${mm}-${dd}`
    }
    cargar()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!cargando && data) {
      setTimeout(() => window.print(), 600)
    }
  }, [cargando, data])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
        Generando reporte...
      </div>
    )
  }

  if (!data) return null

  const tituloRango: Record<string, string> = {
    hoy: 'Hoy',
    semana: 'Últimos 7 días',
    mes: 'Mes actual',
    custom: 'Rango personalizado',
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .reporte-print, .reporte-print * { visibility: visible; }
          .reporte-print {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          @page { size: letter; margin: 1.5cm; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="no-print mb-4 flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn btn-primary"
            >
              📄 Descargar / Imprimir PDF
            </button>
            <button
              onClick={() => window.close()}
              className="btn btn-ghost"
            >
              Cerrar
            </button>
          </div>

          <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
            💡 En el diálogo de impresión, selecciona <strong>"Guardar como PDF"</strong> como destino.
            Para mejor presentación, desactiva <strong>"Encabezados y pies de página"</strong>.
          </div>

          <div className="reporte-print bg-white rounded-2xl shadow-sm p-8" style={{ color: 'black' }}>
            <header className="border-b-4 border-[#FF441F] pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">REPORTE DE ENTREGAS</h1>
                  <p className="text-lg text-gray-700 mt-1">Domiciliario: <strong>{nombre}</strong></p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Generado: {new Date().toLocaleString('es-CO')}</p>
                  <p className="font-bold text-[#FF441F] mt-1">{tituloRango[tipo]}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Periodo: {new Date(data.desde).toLocaleDateString('es-CO')} — {new Date(data.hasta).toLocaleDateString('es-CO')}
              </p>
            </header>

            {/* Resumen */}
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3">Resumen del periodo</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Entregas</p>
                  <p className="text-3xl font-bold text-orange-700">{data.total_entregas}</p>
                </div>
                <div className="border-2 border-blue-300 bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Tiempo promedio</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {data.total_entregas > 0 ? `${Math.floor(data.tiempo_promedio_seg / 60)} min` : '—'}
                  </p>
                </div>
                <div className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Ventas cobradas</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmtCOP(Number(data.total_ventas))}</p>
                  <p className="text-xs text-gray-500 mt-1">Suma total de los pedidos entregados</p>
                </div>
                <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Domicilios</p>
                  <p className="text-2xl font-bold text-amber-700 tabular-nums">{fmtCOP(Number(data.total_domicilios))}</p>
                  <p className="text-xs text-gray-500 mt-1">Valor cobrado por entregas</p>
                </div>
              </div>
            </section>

            {/* Detalle */}
            <section>
              <h2 className="text-lg font-bold mb-3">Detalle de entregas</h2>
              {data.entregas.length === 0 ? (
                <p className="text-gray-500 italic">Sin entregas en este periodo.</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-2 px-3 border">#</th>
                      <th className="text-left py-2 px-3 border">Fecha/Hora</th>
                      <th className="text-left py-2 px-3 border">Cliente</th>
                      <th className="text-left py-2 px-3 border">Dirección</th>
                      <th className="text-right py-2 px-3 border">Tiempo</th>
                      <th className="text-right py-2 px-3 border">Total</th>
                      <th className="text-right py-2 px-3 border">Domi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entregas.map((e: any) => (
                      <tr key={e.id} className="border-t">
                        <td className="py-2 px-3 border font-bold">{e.numero}</td>
                        <td className="py-2 px-3 border text-xs">
                          {new Date(e.entregado_at).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3 border text-xs">{e.cliente_nombre ?? '—'}</td>
                        <td className="py-2 px-3 border text-xs">{e.direccion ?? '—'}</td>
                        <td className="py-2 px-3 border text-right text-xs">
                          {e.tiempo_seg ? `${Math.floor(e.tiempo_seg / 60)} min` : '—'}
                        </td>
                        <td className="py-2 px-3 border text-right tabular-nums text-xs">
                          {fmtCOP(Number(e.total))}
                        </td>
                        <td className="py-2 px-3 border text-right tabular-nums text-xs">
                          {fmtCOP(Number(e.valor_domicilio))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="py-2 px-3 border text-right">TOTAL</td>
                      <td className="py-2 px-3 border text-right tabular-nums">
                        {fmtCOP(Number(data.total_ventas))}
                      </td>
                      <td className="py-2 px-3 border text-right tabular-nums">
                        {fmtCOP(Number(data.total_domicilios))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>

            <footer className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
              Documento generado automáticamente · POS Profesional
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}
