'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeProvider'

type ItemPedido = {
  id: string
  cantidad: number
  observacion: string | null
  producto: { nombre: string; tiempo_preparacion_min: number | null }
}

type Pedido = {
  id: string
  numero_consecutivo: number
  estado: 'EN_COCINA' | 'LISTO'
  created_at: string
  caja: { nombre: string } | null
  cajera: { nombre: string } | null
  cliente: { nombre: string | null } | null
  es_domicilio: boolean
  observaciones: string | null
  items: ItemPedido[]
}

function Cronometro({ desde, objetivo }: { desde: string; objetivo: number }) {
  const [seg, setSeg] = useState(() =>
    Math.floor((Date.now() - new Date(desde).getTime()) / 1000)
  )
  useEffect(() => {
    const t = setInterval(() => {
      setSeg(Math.floor((Date.now() - new Date(desde).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [desde])
  const min = Math.floor(seg / 60)
  const ss = seg % 60
  const pct = objetivo > 0 ? Math.min((min / objetivo) * 100, 100) : 0
  const tono =
    pct < 60 ? 'bg-emerald-500' : pct < 100 ? 'bg-amber-500' : 'bg-red-500'
  const texto =
    pct < 60 ? 'text-emerald-500' : pct < 100 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className={`text-2xl font-bold tabular-nums ${texto}`}>
        {min}:{String(ss).padStart(2, '0')}
      </div>
      {objetivo > 0 && (
        <div className="flex-1 max-w-[80px] h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className={`h-full ${tono}`}
          />
        </div>
      )}
    </div>
  )
}

export default function PantallaCocina({
  pedidosIniciales,
  nombre,
}: {
  pedidosIniciales: Pedido[]
  nombre: string
}) {
  const supabase = createClient()
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [audioListo, setAudioListo] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cantidadAnterior = useRef(pedidosIniciales.length)

  useEffect(() => {
    const ch = supabase
      .channel('cocina-screen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        async () => {
          const { data } = await supabase
            .from('ventas')
            .select(
              `id, numero_consecutivo, estado, created_at, es_domicilio, observaciones,
               caja:cajas(nombre),
               cajera:profiles!ventas_cajera_id_fkey(nombre),
               cliente:clientes(nombre),
               items:venta_items(id, cantidad, observacion, producto:productos(nombre, tiempo_preparacion_min))`
            )
            .in('estado', ['EN_COCINA', 'LISTO'])
            .order('created_at', { ascending: true })
          if (data) {
            const lista = data as any[]
            // Tocar sonido si llegó nuevo
            if (lista.length > cantidadAnterior.current && audioListo && audioRef.current) {
              audioRef.current.play().catch(() => {})
            }
            cantidadAnterior.current = lista.length
            setPedidos(lista as Pedido[])
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line
  }, [audioListo])

  const marcarListo = async (id: string) => {
    const { error } = await supabase
      .from('ventas')
      .update({ estado: 'LISTO', listo_at: new Date().toISOString() })
      .eq('id', id)
    if (error) alert('Error: ' + error.message)
  }

  const imprimirComanda = (id: string) =>
    window.open(`/comanda/${id}`, '_blank', 'width=400,height=720')

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const habilitarSonido = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/notification.mp3')
    }
    audioRef.current
      .play()
      .then(() => {
        audioRef.current?.pause()
        if (audioRef.current) audioRef.current.currentTime = 0
        setAudioListo(true)
      })
      .catch(() => alert('No se pudo activar el sonido. Revisa permisos.'))
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] px-5 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl">
            🍳
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">Cocina</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">{nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={cerrarSesion}
            className="btn btn-ghost text-sm !py-2"
          >
            Salir
          </button>
        </div>
      </header>

      {!audioListo && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 mx-4 mt-4 p-3 rounded-xl flex items-center justify-between gap-3"
        >
          <div>
            <p className="font-semibold text-sm">🔔 Habilita las alertas sonoras</p>
            <p className="text-xs opacity-80">El navegador requiere un click para reproducir audio</p>
          </div>
          <button onClick={habilitarSonido} className="btn btn-primary text-sm !py-2">
            Habilitar
          </button>
        </motion.div>
      )}

      <main className="p-4">
        {pedidos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🍽️
            </motion.div>
            <p className="text-xl font-semibold mb-1">No hay pedidos pendientes</p>
            <p className="text-sm text-[var(--text-muted)]">
              Los nuevos pedidos aparecerán aquí automáticamente
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {pedidos.map((p) => {
                const tiempoMax = Math.max(0, ...p.items.map((it) => it.producto.tiempo_preparacion_min ?? 0))
                const esListo = p.estado === 'LISTO'
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className={`card overflow-hidden border-2 ${
                      esListo
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-[var(--brand)]'
                    }`}
                  >
                    <div className={`px-4 py-3 ${
                      esListo ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-[var(--brand-soft)]'
                    } flex items-center justify-between`}>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">{p.caja?.nombre ?? '—'}</p>
                        <p className="font-display text-3xl leading-none">#{p.numero_consecutivo}</p>
                      </div>
                      <Cronometro desde={p.created_at} objetivo={tiempoMax} />
                    </div>

                    <div className="p-4 space-y-3">
                      {p.es_domicilio && (
                        <span className="inline-flex items-center gap-1 badge bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                          🛵 DOMICILIO
                        </span>
                      )}
                      {p.cliente?.nombre && (
                        <p className="text-sm">👤 {p.cliente.nombre}</p>
                      )}

                      <div className="space-y-2">
                        {p.items.map((it) => (
                          <div key={it.id} className="bg-[var(--bg-subtle)] rounded-xl p-3">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-[var(--brand)]">
                                {it.cantidad}×
                              </span>
                              <span className="font-semibold flex-1">{it.producto.nombre}</span>
                            </div>
                            {it.observacion && (
                              <div className="mt-2 bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 rounded-lg px-2 py-1 text-xs font-medium">
                                ⚠️ {it.observacion}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {p.observaciones && (
                        <div className="bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 rounded-lg p-2 text-xs">
                          📝 {p.observaciones}
                        </div>
                      )}

                      <div className="space-y-2 pt-2">
                        {!esListo && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => marcarListo(p.id)}
                            className="btn w-full !py-3 bg-emerald-500 text-white text-base"
                          >
                            ✓ Marcar LISTO
                          </motion.button>
                        )}
                        {esListo && (
                          <div className="text-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl font-bold">
                            ⏳ LISTO – esperando entrega
                          </div>
                        )}
                        <button
                          onClick={() => imprimirComanda(p.id)}
                          className="btn btn-ghost w-full text-sm !py-2"
                        >
                          🖨️ Imprimir comanda
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
