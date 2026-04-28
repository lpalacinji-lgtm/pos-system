'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

function Cronometro({ desde }: { desde: string }) {
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
  const color =
    min < 15 ? 'text-emerald-500' : min < 25 ? 'text-amber-500' : 'text-red-500'
  return (
    <span className={`tabular-nums font-mono font-bold ${color}`}>
      {String(min).padStart(2, '0')}:{String(ss).padStart(2, '0')}
    </span>
  )
}

export default function DomicilioModule({
  pedidosIniciales,
  userId,
}: {
  pedidosIniciales: Pedido[]
  userId: string
}) {
  const supabase = createClient()
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [filtro, setFiltro] = useState<'mios' | 'disponibles'>('mios')
  const [gpsEstado, setGpsEstado] = useState<'pidiendo' | 'activo' | 'rechazado' | 'inactivo'>('inactivo')
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const misActivos = pedidos.filter(
    (p) => p.domiciliario_id === userId && (p.estado === 'LISTO' || p.estado === 'EN_RUTA')
  ).length

  useEffect(() => {
    if (misActivos > 0 && gpsEstado === 'inactivo') pedirGps()
    if (misActivos === 0 && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setGpsEstado('inactivo')
    }
    // eslint-disable-next-line
  }, [misActivos])

  const pedirGps = () => {
    if (!('geolocation' in navigator)) return setGpsEstado('rechazado')
    setGpsEstado('pidiendo')
    const id = navigator.geolocation.watchPosition(
      () => setGpsEstado('activo'),
      () => setGpsEstado('rechazado'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
    )
    watchIdRef.current = id
  }

  const capturarPos = (): Promise<{ lat: number | null; lng: number | null }> =>
    new Promise((res) => {
      if (!('geolocation' in navigator)) return res({ lat: null, lng: null })
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => res({ lat: null, lng: null }),
        { timeout: 5000, enableHighAccuracy: true }
      )
    })

  useEffect(() => {
    const ch = supabase
      .channel('domi-ventas')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ventas' },
        async (payload) => {
          const n = payload.new as any
          if (!n.es_domicilio) return
          if (n.estado === 'ENTREGADO' || n.estado === 'CANCELADO') {
            setPedidos((p) => p.filter((x) => x.id !== n.id))
            return
          }
          const visible =
            (n.estado === 'LISTO' && !n.domiciliario_id) || n.domiciliario_id === userId
          if (!visible) return setPedidos((p) => p.filter((x) => x.id !== n.id))

          const { data } = await supabase
            .from('ventas')
            .select(
              `id, numero_consecutivo, estado, direccion_entrega, total, metodo_pago,
               created_at, listo_at, en_ruta_at, domiciliario_id,
               cliente:clientes(nombre, telefono)`
            )
            .eq('id', n.id)
            .single()
          if (data)
            setPedidos((prev) => {
              const e = prev.some((x) => x.id === data.id)
              return e
                ? prev.map((x) => (x.id === data.id ? (data as any) : x))
                : [...prev, data as any]
            })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line
  }, [userId])

  const showToast = (msg: string, tipo: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const tomar = async (id: string) => {
    const pos = await capturarPos()
    const { error } = await supabase
      .from('ventas')
      .update({
        domiciliario_id: userId,
        estado: 'EN_RUTA',
        en_ruta_at: new Date().toISOString(),
        recogida_lat: pos.lat,
        recogida_lng: pos.lng,
      })
      .eq('id', id)
      .eq('estado', 'LISTO')
      .is('domiciliario_id', null)
    if (error) return showToast('Error: ' + error.message, 'err')
    showToast('¡Pedido tomado!')
  }

  const iniciar = async (id: string) => {
    const pos = await capturarPos()
    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'EN_RUTA',
        en_ruta_at: new Date().toISOString(),
        recogida_lat: pos.lat,
        recogida_lng: pos.lng,
      })
      .eq('id', id)
      .eq('estado', 'LISTO')
      .eq('domiciliario_id', userId)
    if (error) return showToast('Error: ' + error.message, 'err')
    showToast('Entrega iniciada')
  }

  const entregar = async (id: string) => {
    if (!confirm('¿Confirmas que el pedido fue entregado y cobrado?')) return
    const pos = await capturarPos()
    const p = pedidos.find((x) => x.id === id)
    const seg = p?.en_ruta_at
      ? Math.floor((Date.now() - new Date(p.en_ruta_at).getTime()) / 1000)
      : null
    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'ENTREGADO',
        entregado_at: new Date().toISOString(),
        entrega_lat: pos.lat,
        entrega_lng: pos.lng,
        tiempo_entrega_segundos: seg,
      })
      .eq('id', id)
    if (error) return showToast('Error: ' + error.message, 'err')
    const min = seg ? Math.floor(seg / 60) : null
    showToast(
      `✓ #${p?.numero_consecutivo} entregado${min !== null ? ` en ${min} min` : ''}`
    )
  }

  const abrirMapa = (dir: string) =>
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`,
      '_blank'
    )

  const llamar = (tel: string) => {
    const limpio = tel.replace(/\D/g, '').replace(/^57/, '')
    window.location.href = `tel:+57${limpio}`
  }

  const disponibles = pedidos.filter((p) => p.estado === 'LISTO' && !p.domiciliario_id)
  const mios = pedidos.filter(
    (p) => p.domiciliario_id === userId && (p.estado === 'LISTO' || p.estado === 'EN_RUTA')
  )
  const lista = filtro === 'disponibles' ? disponibles : mios

  return (
    <div className="pb-24 min-h-screen bg-[var(--bg)]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={`fixed top-4 right-4 left-4 md:left-auto md:max-w-sm z-50 rounded-2xl shadow-xl px-5 py-4 text-white font-semibold ${
              toast.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS banner */}
      {misActivos > 0 && gpsEstado !== 'activo' && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className={`px-5 py-3 text-sm flex items-center justify-between gap-3 ${
            gpsEstado === 'rechazado'
              ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
          }`}
        >
          <span className="font-medium">
            {gpsEstado === 'pidiendo' && '📍 Activando GPS…'}
            {gpsEstado === 'rechazado' && '⚠️ GPS bloqueado. Activa la ubicación.'}
            {gpsEstado === 'inactivo' && '📍 Activa el GPS mientras tengas pedidos.'}
          </span>
          {gpsEstado !== 'pidiendo' && (
            <button
              onClick={pedirGps}
              className="bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-full font-semibold border border-current"
            >
              Activar
            </button>
          )}
        </motion.div>
      )}
      {misActivos > 0 && gpsEstado === 'activo' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-5 py-2 text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft" />
          GPS activo · {misActivos} pedido{misActivos > 1 ? 's' : ''} en curso
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[var(--bg-elevated)] border-b border-[var(--border)] flex sticky top-0 z-20">
        <button
          onClick={() => setFiltro('mios')}
          className={`flex-1 py-4 text-sm font-bold relative transition ${
            filtro === 'mios' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
          }`}
        >
          Mis entregas
          {mios.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 text-xs bg-[var(--brand)] text-white rounded-full px-1.5">
              {mios.length}
            </span>
          )}
          {filtro === 'mios' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--brand)] rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setFiltro('disponibles')}
          className={`flex-1 py-4 text-sm font-bold relative transition ${
            filtro === 'disponibles' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
          }`}
        >
          Disponibles
          {disponibles.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 text-xs bg-emerald-500 text-white rounded-full px-1.5">
              {disponibles.length}
            </span>
          )}
          {filtro === 'disponibles' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--brand)] rounded-full"
            />
          )}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {lista.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🛵
            </motion.div>
            <p className="text-xl font-semibold mb-1">
              {filtro === 'mios' ? 'Sin pedidos asignados' : 'Sin pedidos disponibles'}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {filtro === 'mios'
                ? 'Cuando te asignen una entrega aparecerá aquí'
                : 'Apenas cocina marque un pedido como listo, lo verás'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {lista.map((p) => {
              const cronoDesde = p.en_ruta_at ?? p.listo_at ?? p.created_at
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="card overflow-hidden"
                >
                  {/* Header con número y total */}
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                        Pedido
                      </p>
                      <p className="text-3xl font-display leading-none">
                        #{p.numero_consecutivo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                        Cobrar
                      </p>
                      <p className="text-2xl font-bold text-[var(--brand)]">
                        {fmtCOP(p.total)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] uppercase mt-0.5">
                        {p.metodo_pago}
                      </p>
                    </div>
                  </div>

                  {/* Cronómetro */}
                  <div className="px-4 py-2 bg-[var(--bg-subtle)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">
                      {p.estado === 'EN_RUTA' ? 'En ruta hace' : 'Esperando hace'}
                    </span>
                    <Cronometro desde={cronoDesde} />
                  </div>

                  {/* Contenido */}
                  <div className="p-4 space-y-3">
                    {p.cliente?.nombre && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] font-bold">
                          {p.cliente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{p.cliente.nombre}</p>
                          {p.cliente.telefono && (
                            <p className="text-xs text-[var(--text-muted)]">
                              {p.cliente.telefono}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {p.direccion_entrega && (
                      <button
                        onClick={() => abrirMapa(p.direccion_entrega!)}
                        className="w-full text-left bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-2xl p-3 flex items-start gap-3 transition"
                      >
                        <span className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                          📍
                        </span>
                        <span className="text-sm text-blue-900 dark:text-blue-200 flex-1 leading-tight">
                          {p.direccion_entrega}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                          Mapa →
                        </span>
                      </button>
                    )}

                    {p.cliente?.telefono && (
                      <button
                        onClick={() => llamar(p.cliente!.telefono!)}
                        className="w-full bg-[var(--bg-subtle)] hover:bg-[var(--border)] rounded-2xl p-3 flex items-center justify-center gap-2 font-semibold text-sm transition"
                      >
                        📞 Llamar al cliente
                      </button>
                    )}

                    {p.estado === 'LISTO' && !p.domiciliario_id ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => tomar(p.id)}
                        className="btn btn-primary w-full !py-4 text-base"
                      >
                        Tomar este pedido
                      </motion.button>
                    ) : p.estado === 'LISTO' && p.domiciliario_id === userId ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => iniciar(p.id)}
                        className="btn w-full !py-4 text-base bg-amber-500 text-white"
                      >
                        🚀 Iniciar entrega
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => entregar(p.id)}
                        className="btn w-full !py-4 text-base bg-emerald-500 text-white"
                      >
                        ✓ Entregado
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-elevated)] border-t border-[var(--border)] safe-bottom z-30 glass">
      <div className="flex">
        <Link
          href="/domicilio"
          className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--brand)]"
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs font-bold">Inicio</span>
        </Link>
        <Link
          href="/domicilio/historial"
          className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--text-muted)]"
        >
          <span className="text-xl">📊</span>
          <span className="text-xs font-bold">Historial</span>
        </Link>
        <Link
          href="/domicilio/perfil"
          className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--text-muted)]"
        >
          <span className="text-xl">👤</span>
          <span className="text-xs font-bold">Perfil</span>
        </Link>
      </div>
    </div>
  )
}
