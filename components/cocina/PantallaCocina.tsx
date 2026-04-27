'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Item = {
  id: string
  cantidad: number
  observacion: string | null
  producto: { nombre: string; tiempo_preparacion_min: number | null }
}

type Pedido = {
  id: string
  numero_consecutivo: number
  estado: 'EN_COCINA' | 'LISTO'
  es_domicilio: boolean
  direccion_entrega: string | null
  created_at: string
  cocina_at: string | null
  listo_at: string | null
  caja: { nombre: string } | null
  cliente: { nombre: string; telefono: string | null } | null
  items: Item[]
}

export default function PantallaCocina({
  pedidosIniciales,
}: {
  pedidosIniciales: Pedido[]
}) {
  const supabase = createBrowserSupabase()
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const newOrderIds = useRef<Set<string>>(new Set())

  // Inicializa audio (requiere interacción del usuario en navegadores modernos)
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.preload = 'auto'
  }, [])

  const habilitarSonido = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause()
          audioRef.current!.currentTime = 0
          setAudioReady(true)
        })
        .catch(() => setAudioReady(true))
    } else {
      setAudioReady(true)
    }
  }

  const reproducirAlerta = () => {
    if (audioRef.current && audioReady) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }

  // Suscripción Realtime
  useEffect(() => {
    const channel = supabase
      .channel('cocina-ventas')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ventas' },
        async (payload) => {
          const nuevo = payload.new as { id: string; estado: string }
          // Si pasó a EN_COCINA, recarga pedido completo y dispara alerta
          if (nuevo.estado === 'EN_COCINA') {
            const { data } = await supabase
              .from('ventas')
              .select(
                `id, numero_consecutivo, estado, es_domicilio, direccion_entrega, created_at, cocina_at, listo_at,
                 caja:cajas(nombre),
                 cliente:clientes(nombre, telefono),
                 items:venta_items(id, cantidad, observacion, producto:productos(nombre, tiempo_preparacion_min))`
              )
              .eq('id', nuevo.id)
              .single()
            if (data) {
              setPedidos((prev) => {
                if (prev.some((p) => p.id === data.id)) return prev
                newOrderIds.current.add(data.id)
                return [...prev, data as unknown as Pedido]
              })
              reproducirAlerta()
              // Quita el pulse después de 5s
              setTimeout(() => {
                newOrderIds.current.delete(nuevo.id)
                setPedidos((p) => [...p])
              }, 5000)
            }
          } else if (nuevo.estado === 'LISTO') {
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === nuevo.id ? { ...p, estado: 'LISTO' as const } : p
              )
            )
          } else if (
            nuevo.estado === 'EN_RUTA' ||
            nuevo.estado === 'ENTREGADO' ||
            nuevo.estado === 'CANCELADO'
          ) {
            // Sale de cocina
            setPedidos((prev) => prev.filter((p) => p.id !== nuevo.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioReady])

  const marcarListo = async (id: string) => {
    const { error } = await supabase
      .from('ventas')
      .update({ estado: 'LISTO', listo_at: new Date().toISOString() })
      .eq('id', id)
    if (error) alert('Error: ' + error.message)
  }

  const calcularMinutos = (desde: string) => {
    const diff = Date.now() - new Date(desde).getTime()
    return Math.floor(diff / 60000)
  }

  // Refresca tiempos cada 30s
  const [, forceRender] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceRender((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="p-6">
      {!audioReady && (
        <div className="mb-6 bg-amber-500/20 border border-amber-500 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-200">🔔 Habilita las alertas sonoras</p>
            <p className="text-sm text-amber-300/80">El navegador requiere un click para reproducir audio.</p>
          </div>
          <button
            onClick={habilitarSonido}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-5 py-2 rounded-lg"
          >
            Habilitar sonido
          </button>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-6xl mb-4">🍽️</p>
          <p className="text-xl">No hay pedidos pendientes</p>
          <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {pedidos.map((pedido) => {
            const minutos = pedido.cocina_at
              ? calcularMinutos(pedido.cocina_at)
              : calcularMinutos(pedido.created_at)
            const tiempoMax = Math.max(
              ...pedido.items.map((i) => i.producto.tiempo_preparacion_min ?? 10)
            )
            const atrasado = minutos > tiempoMax
            const esNuevo = newOrderIds.current.has(pedido.id)

            return (
              <div
                key={pedido.id}
                className={`rounded-xl border-2 p-4 transition ${
                  pedido.estado === 'LISTO'
                    ? 'bg-emerald-900/40 border-emerald-500'
                    : atrasado
                    ? 'bg-red-900/40 border-red-500'
                    : 'bg-slate-800 border-slate-700'
                } ${esNuevo ? 'animate-pulse-ring' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400">{pedido.caja?.nombre}</p>
                    <h3 className="text-2xl font-bold">#{pedido.numero_consecutivo}</h3>
                  </div>
                  <div
                    className={`text-right ${
                      atrasado ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    <p className="text-3xl font-bold tabular-nums">{minutos}'</p>
                    <p className="text-xs">objetivo {tiempoMax}'</p>
                  </div>
                </div>

                {pedido.es_domicilio && (
                  <div className="bg-orange-500/20 text-orange-200 text-xs font-semibold px-2 py-1 rounded mb-2 inline-block">
                    🛵 DOMICILIO
                  </div>
                )}
                {pedido.cliente?.nombre && (
                  <p className="text-sm text-slate-300 mb-2">
                    👤 {pedido.cliente.nombre}
                  </p>
                )}

                <ul className="space-y-2 mb-4">
                  {pedido.items.map((item) => (
                    <li
                      key={item.id}
                      className="bg-slate-900/50 rounded-lg p-2 border border-slate-700"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-400">
                          {item.cantidad}×
                        </span>
                        <span className="text-lg font-medium">
                          {item.producto.nombre}
                        </span>
                      </div>
                      {item.observacion && (
                        <p className="text-sm text-amber-300 mt-1 pl-1">
                          ⚠️ {item.observacion}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                {pedido.estado === 'EN_COCINA' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => marcarListo(pedido.id)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-lg text-lg"
                    >
                      ✓ Marcar LISTO
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `/comanda/${pedido.id}`,
                          '_blank',
                          'width=420,height=720'
                        )
                      }
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
                    >
                      🖨️ Imprimir comanda
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full bg-emerald-700/50 text-emerald-200 font-bold py-3 rounded-lg text-center">
                      LISTO – esperando entrega
                    </div>
                    <button
                      onClick={() =>
                        window.open(
                          `/comanda/${pedido.id}`,
                          '_blank',
                          'width=420,height=720'
                        )
                      }
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
                    >
                      🖨️ Reimprimir comanda
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
