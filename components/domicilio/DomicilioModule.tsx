'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Pedido = {
  id: string
  numero_consecutivo: number
  estado: 'LISTO' | 'EN_RUTA'
  direccion_entrega: string | null
  total: number
  metodo_pago: string
  created_at: string
  listo_at: string | null
  en_ruta_at: string | null
  domiciliario_id: string | null
  cliente: { nombre: string | null; telefono: string | null } | null
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function DomicilioModule({
  pedidosIniciales,
  userId,
}: {
  pedidosIniciales: Pedido[]
  userId: string
}) {
  const supabase = createBrowserSupabase()
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [filtro, setFiltro] = useState<'disponibles' | 'mios'>('mios')

  useEffect(() => {
    const channel = supabase
      .channel('domicilio-ventas')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ventas' },
        async (payload) => {
          const nuevo = payload.new as { id: string; estado: string; es_domicilio: boolean; domiciliario_id: string | null }
          if (!nuevo.es_domicilio) return

          if (nuevo.estado === 'ENTREGADO' || nuevo.estado === 'CANCELADO') {
            setPedidos((p) => p.filter((x) => x.id !== nuevo.id))
            return
          }

          const visible =
            (nuevo.estado === 'LISTO' && !nuevo.domiciliario_id) ||
            nuevo.domiciliario_id === userId

          if (!visible) {
            setPedidos((p) => p.filter((x) => x.id !== nuevo.id))
            return
          }

          const { data } = await supabase
            .from('ventas')
            .select(
              `id, numero_consecutivo, estado, direccion_entrega, total, metodo_pago,
               created_at, listo_at, en_ruta_at, domiciliario_id,
               cliente:clientes(nombre, telefono)`
            )
            .eq('id', nuevo.id)
            .single()

          if (data) {
            setPedidos((prev) => {
              const existe = prev.some((x) => x.id === data.id)
              if (existe) return prev.map((x) => (x.id === data.id ? (data as unknown as Pedido) : x))
              return [...prev, data as unknown as Pedido]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line
  }, [userId])

  const tomarPedido = async (id: string) => {
    const { error } = await supabase
      .from('ventas')
      .update({
        domiciliario_id: userId,
        estado: 'EN_RUTA',
        en_ruta_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('estado', 'LISTO') // optimistic concurrency
      .is('domiciliario_id', null)
    if (error) alert('Error: ' + error.message)
  }

  const marcarEntregado = async (id: string) => {
    if (!confirm('¿Confirmas que el pedido fue entregado y cobrado?')) return

    // Captura GPS opcional
    let lat: number | null = null
    let lng: number | null = null
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {
        // sin GPS está bien
      }
    }

    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'ENTREGADO',
        entregado_at: new Date().toISOString(),
        entrega_lat: lat,
        entrega_lng: lng,
      })
      .eq('id', id)
    if (error) alert('Error: ' + error.message)
  }

  const abrirMapa = (direccion: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
    window.open(url, '_blank')
  }

  const llamar = (tel: string) => {
    window.location.href = `tel:+57${tel.replace(/\D/g, '').replace(/^57/, '')}`
  }

  const disponibles = pedidos.filter((p) => p.estado === 'LISTO' && !p.domiciliario_id)
  const mios = pedidos.filter((p) => p.domiciliario_id === userId && p.estado === 'EN_RUTA')

  const lista = filtro === 'disponibles' ? disponibles : mios

  return (
    <div className="pb-24">
      <div className="bg-white border-b border-slate-200 flex sticky top-[60px] z-10">
        <button
          onClick={() => setFiltro('mios')}
          className={`flex-1 py-3 text-sm font-medium ${
            filtro === 'mios'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500'
          }`}
        >
          Mis entregas ({mios.length})
        </button>
        <button
          onClick={() => setFiltro('disponibles')}
          className={`flex-1 py-3 text-sm font-medium ${
            filtro === 'disponibles'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500'
          }`}
        >
          Disponibles ({disponibles.length})
        </button>
      </div>

      <div className="p-3 space-y-3">
        {lista.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-5xl mb-3">📭</p>
            <p>No hay pedidos {filtro === 'mios' ? 'asignados' : 'disponibles'}.</p>
          </div>
        ) : (
          lista.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-slate-500">Pedido</p>
                  <p className="text-2xl font-bold text-slate-800">#{p.numero_consecutivo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-xl font-bold text-emerald-600">{fmtCOP(p.total)}</p>
                  <p className="text-xs text-slate-500 uppercase">{p.metodo_pago}</p>
                </div>
              </div>

              {p.cliente?.nombre && (
                <p className="text-sm font-medium text-slate-700 mb-1">
                  👤 {p.cliente.nombre}
                </p>
              )}

              {p.direccion_entrega && (
                <button
                  onClick={() => abrirMapa(p.direccion_entrega!)}
                  className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 mb-2 flex items-start gap-2"
                >
                  <span className="text-xl">📍</span>
                  <span className="text-sm text-blue-900 flex-1">{p.direccion_entrega}</span>
                  <span className="text-xs text-blue-600 font-semibold">Abrir mapa →</span>
                </button>
              )}

              {p.cliente?.telefono && (
                <button
                  onClick={() => llamar(p.cliente!.telefono!)}
                  className="w-full bg-slate-100 hover:bg-slate-200 rounded-lg p-2 mb-3 flex items-center justify-center gap-2 text-slate-700 font-medium text-sm"
                >
                  📞 Llamar al {p.cliente.telefono}
                </button>
              )}

              {p.estado === 'LISTO' ? (
                <button
                  onClick={() => tomarPedido(p.id)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg"
                >
                  Tomar este pedido
                </button>
              ) : (
                <button
                  onClick={() => marcarEntregado(p.id)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg"
                >
                  ✓ Entregado
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
