'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Caja = {
  id: string
  nombre: string
  ubicacion: string | null
}

type CierreHistorico = {
  id: string
  caja_id: string
  desde: string
  hasta: string
  total_ventas: number
  cantidad_ventas: number
  created_at: string
  cerrado_por_profile: { nombre: string } | null
  caja: { nombre: string } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function CierresModule({
  cajas,
  cierresHistoricos,
}: {
  cajas: Caja[]
  cierresHistoricos: CierreHistorico[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [procesando, setProcesando] = useState<string | null>(null)
  const [obs, setObs] = useState('')
  const [cajaSeleccionada, setCajaSeleccionada] = useState<string | null>(null)

  const cerrarCaja = async (cajaId: string) => {
    setProcesando(cajaId)
    const { data, error } = await supabase.rpc('cerrar_caja', {
      p_caja_id: cajaId,
      p_observaciones: obs || null,
    })
    setProcesando(null)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    setObs('')
    setCajaSeleccionada(null)
    router.refresh()
    window.open(`/admin/cierres/${data}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-emerald-600 hover:underline text-sm">
        ← Volver al dashboard
      </Link>

      {/* Cerrar caja */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Cerrar caja</h2>
        <p className="text-sm text-gray-600 mb-3">
          Al cerrar, se genera un snapshot del periodo y la caja vuelve a comenzar
          desde cero. La cajera no se interrumpe.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cajas.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{c.nombre}</h3>
                  <p className="text-xs text-gray-500">{c.ubicacion}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  🟢 OPERATIVA
                </span>
              </div>

              {cajaSeleccionada === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Observaciones (opcional)..."
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => cerrarCaja(c.id)}
                      disabled={procesando === c.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg text-sm"
                    >
                      {procesando === c.id ? 'Cerrando...' : 'Confirmar cierre'}
                    </button>
                    <button
                      onClick={() => {
                        setCajaSeleccionada(null)
                        setObs('')
                      }}
                      className="px-4 bg-gray-200 rounded-lg text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCajaSeleccionada(c.id)}
                  disabled={procesando !== null}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg text-sm mt-2"
                >
                  🔒 Cerrar caja y generar reporte
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Histórico */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Histórico de cierres</h2>
        {cierresHistoricos.length === 0 ? (
          <p className="text-gray-400 text-sm">Aún no hay cierres registrados.</p>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left py-2 px-3">Caja</th>
                  <th className="text-left py-2 px-3">Período</th>
                  <th className="text-right py-2 px-3"># Ventas</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-left py-2 px-3">Cerrado por</th>
                  <th className="text-center py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {cierresHistoricos.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">
                      {c.caja?.nombre ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {new Date(c.desde).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' → '}
                      {new Date(c.hasta).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {c.cantidad_ventas}
                    </td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums">
                      {fmt(Number(c.total_ventas))}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {c.cerrado_por_profile?.nombre ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Link
                        href={`/admin/cierres/${c.id}`}
                        className="text-emerald-600 hover:underline text-sm"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
