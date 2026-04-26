'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Venta = {
  id: string
  numero_consecutivo: number
  created_at: string
  estado: string
  metodo_pago: string
  tipo_factura: string
  total: number
  valor_domicilio: number | null
  es_domicilio: boolean
  direccion_entrega: string | null
  domiciliario_id: string | null
  domiciliario: { nombre: string } | null
  cliente: { nombre: string | null; nit: string | null } | null
}

type Domiciliario = { id: string; nombre: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-700',
  EN_COCINA: 'bg-amber-100 text-amber-700',
  LISTO: 'bg-emerald-100 text-emerald-700',
  EN_RUTA: 'bg-blue-100 text-blue-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

export default function HistorialModule({
  ventas: ventasIniciales,
  domiciliarios,
  cajaId: _cajaId,
}: {
  ventas: Venta[]
  domiciliarios: Domiciliario[]
  cajaId: string
}) {
  const supabase = createClient()
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales)
  const [reasignandoId, setReasignandoId] = useState<string | null>(null)
  const [nuevoDomi, setNuevoDomi] = useState<string>('')

  const reimprimir = (id: string) => {
    window.open(`/recibo/${id}`, '_blank', 'width=420,height=720')
  }

  const reasignar = async (ventaId: string) => {
    if (!nuevoDomi) return
    const { error } = await supabase
      .from('ventas')
      .update({ domiciliario_id: nuevoDomi })
      .eq('id', ventaId)
    if (error) return alert('Error: ' + error.message)
    const domi = domiciliarios.find((d) => d.id === nuevoDomi)
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId
          ? { ...v, domiciliario_id: nuevoDomi, domiciliario: domi ? { nombre: domi.nombre } : null }
          : v
      )
    )
    setReasignandoId(null)
    setNuevoDomi('')
  }

  const totalDia = ventas
    .filter((v) => v.estado !== 'CANCELADO')
    .reduce((acc, v) => acc + Number(v.total), 0)

  const cantidadDia = ventas.filter((v) => v.estado !== 'CANCELADO').length

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase">Ventas hoy</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalDia)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase"># Transacciones</p>
          <p className="text-2xl font-bold">{cantidadDia}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase">Ticket promedio</p>
          <p className="text-2xl font-bold">
            {cantidadDia > 0 ? fmt(totalDia / cantidadDia) : '—'}
          </p>
        </div>
      </div>

      {ventas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Aún no hay ventas en esta caja hoy.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Hora</th>
                <th className="text-left py-2 px-3">Cliente</th>
                <th className="text-left py-2 px-3">Estado</th>
                <th className="text-left py-2 px-3">Pago</th>
                <th className="text-left py-2 px-3">Domiciliario</th>
                <th className="text-right py-2 px-3">Total</th>
                <th className="text-center py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-bold">{v.numero_consecutivo}</td>
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {new Date(v.created_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {v.cliente?.nombre ?? <span className="text-gray-400">—</span>}
                    {v.cliente?.nit && (
                      <span className="block text-xs text-gray-500">{v.cliente.nit}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        ESTADO_BADGE[v.estado] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {v.estado}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs uppercase text-gray-600">
                    {v.metodo_pago}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {v.es_domicilio ? (
                      reasignandoId === v.id ? (
                        <div className="flex gap-1">
                          <select
                            value={nuevoDomi}
                            onChange={(e) => setNuevoDomi(e.target.value)}
                            className="text-xs border rounded px-2 py-1 flex-1"
                          >
                            <option value="">— Selecciona —</option>
                            {domiciliarios.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.nombre}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => reasignar(v.id)}
                            className="bg-emerald-500 text-white text-xs px-2 rounded"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setReasignandoId(null)
                              setNuevoDomi('')
                            }}
                            className="bg-gray-300 text-xs px-2 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReasignandoId(v.id)
                            setNuevoDomi(v.domiciliario_id ?? '')
                          }}
                          className="text-left hover:text-emerald-600"
                          title="Click para reasignar"
                        >
                          {v.domiciliario?.nombre ?? (
                            <span className="text-amber-600 underline">
                              Sin asignar
                            </span>
                          )}{' '}
                          ✏️
                        </button>
                      )
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold">
                    {fmt(Number(v.total))}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => reimprimir(v.id)}
                      className="text-emerald-600 hover:text-emerald-800 text-sm"
                      title="Ver / reimprimir recibo"
                    >
                      🖨️ Recibo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
