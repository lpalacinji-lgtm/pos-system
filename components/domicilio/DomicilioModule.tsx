'use client'

import { useEffect, useRef, useState } from 'react'
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

// Cronómetro vivo en formato mm:ss desde una fecha de inicio
function Cronometro({ desde }: { desde: string }) {
  const [segundos, setSegundos] = useState(() =>
    Math.floor((Date.now() - new Date(desde).getTime()) / 1000)
  )

  useEffect(() => {
    const t = setInterval(() => {
      setSegundos(Math.floor((Date.now() - new Date(desde).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [desde])

  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  const colorClase =
    min < 15
      ? 'text-emerald-600'
      : min < 25
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <span className={`tabular-nums font-mono font-bold ${colorClase}`}>
      ⏱ {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
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

  // Cuántos pedidos activos tengo (para saber si necesito GPS)
  const misPedidosActivos = pedidos.filter(
    (p) =>
      p.domiciliario_id === userId &&
      (p.estado === 'LISTO' || p.estado === 'EN_RUTA')
  ).length

  // Activar GPS cuando tengo pedidos a cargo
  useEffect(() => {
    if (misPedidosActivos > 0 && gpsEstado === 'inactivo') {
      pedirGps()
    }
    if (misPedidosActivos === 0 && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setGpsEstado('inactivo')
    }
    // eslint-disable-next-line
  }, [misPedidosActivos])

  const pedirGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsEstado('rechazado')
      return
    }
    setGpsEstado('pidiendo')
    const id = navigator.geolocation.watchPosition(
      () => setGpsEstado('activo'),
      () => setGpsEstado('rechazado'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
    )
    watchIdRef.current = id
  }

  // Captura una posición puntual (best-effort)
  const capturarPosicion = (): Promise<{ lat: number | null; lng: number | null }> =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve({ lat: null, lng: null })
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000, enableHighAccuracy: true }
      )
    })

  // Realtime subscribe
  useEffect(() => {
    const channel = supabase
      .channel('domicilio-ventas')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ventas' },
        async (payload) => {
          const nuevo = payload.new as {
            id: string
            estado: string
            es_domicilio: boolean
            domiciliario_id: string | null
          }
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
              if (existe)
                return prev.map((x) =>
                  x.id === data.id ? (data as unknown as Pedido) : x
                )
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

  const mostrarToast = (msg: string, tipo: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const tomarPedido = async (id: string) => {
    const pos = await capturarPosicion()
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
    if (error) return mostrarToast('Error: ' + error.message, 'err')
    mostrarToast('Pedido tomado. ¡En ruta!')
  }

  const iniciarEntrega = async (id: string) => {
    const pos = await capturarPosicion()
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
    if (error) return mostrarToast('Error: ' + error.message, 'err')
    mostrarToast('Entrega iniciada')
  }

  const marcarEntregado = async (id: string) => {
    if (!confirm('¿Confirmas que el pedido fue entregado y cobrado?')) return

    const pos = await capturarPosicion()
    const pedido = pedidos.find((p) => p.id === id)
    const inicio = pedido?.en_ruta_at
    const segundos = inicio
      ? Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)
      : null

    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'ENTREGADO',
        entregado_at: new Date().toISOString(),
        entrega_lat: pos.lat,
        entrega_lng: pos.lng,
        tiempo_entrega_segundos: segundos,
      })
      .eq('id', id)
    if (error) return mostrarToast('Error: ' + error.message, 'err')

    const min = segundos ? Math.floor(segundos / 60) : null
    mostrarToast(
      `✓ Pedido #${pedido?.numero_consecutivo} entregado${
        min !== null ? ` en ${min} min` : ''
      }`
    )
  }

  const abrirMapa = (direccion: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
    window.open(url, '_blank')
  }

  const llamar = (tel: string) => {
    const limpio = tel.replace(/\D/g, '').replace(/^57/, '')
    window.location.href = `tel:+57${limpio}`
  }

  const disponibles = pedidos.filter(
    (p) => p.estado === 'LISTO' && !p.domiciliario_id
  )
  const mios = pedidos.filter(
    (p) =>
      p.domiciliario_id === userId &&
      (p.estado === 'LISTO' || p.estado === 'EN_RUTA')
  )

  const lista = filtro === 'disponibles' ? disponibles : mios

  return (
    <div className="pb-24">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 md:left-auto md:max-w-sm z-50 rounded-lg shadow-lg px-4 py-3 text-white font-medium transition-all ${
            toast.tipo === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      {/* Banner GPS */}
      {misPedidosActivos > 0 && gpsEstado !== 'activo' && (
        <div
          className={`px-4 py-3 text-sm flex items-center justify-between gap-2 ${
            gpsEstado === 'rechazado'
              ? 'bg-red-100 text-red-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          <span>
            {gpsEstado === 'pidiendo' && '📍 Activando GPS…'}
            {gpsEstado === 'rechazado' && '⚠️ GPS bloqueado. Activa la ubicación en tu navegador.'}
            {gpsEstado === 'inactivo' && '📍 Necesitas activar el GPS mientras tengas pedidos.'}
          </span>
          {gpsEstado !== 'pidiendo' && (
            <button
              onClick={pedirGps}
              className="bg-white border border-current px-3 py-1 rounded font-semibold"
            >
              Activar
            </button>
          )}
        </div>
      )}
      {misPedidosActivos > 0 && gpsEstado === 'activo' && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          GPS activo · {misPedidosActivos} pedido{misPedidosActivos > 1 ? 's' : ''} en curso
        </div>
      )}

      {/* Tabs */}
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
          lista.map((p) => {
            const cronoDesde = p.en_ruta_at ?? p.listo_at ?? p.created_at
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-500">Pedido</p>
                    <p className="text-2xl font-bold text-slate-800">
                      #{p.numero_consecutivo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {fmtCOP(p.total)}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">{p.metodo_pago}</p>
                  </div>
                </div>

                {/* Cronómetro vivo */}
                {p.estado === 'EN_RUTA' && p.en_ruta_at && (
                  <div className="bg-slate-50 rounded-lg p-2 mb-2 text-center text-sm">
                    En ruta hace <Cronometro desde={cronoDesde} />
                  </div>
                )}
                {p.estado === 'LISTO' && p.listo_at && (
                  <div className="bg-amber-50 rounded-lg p-2 mb-2 text-center text-sm text-amber-800">
                    Esperando hace <Cronometro desde={p.listo_at} />
                  </div>
                )}

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
                    <span className="text-sm text-blue-900 flex-1">
                      {p.direccion_entrega}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold">
                      Mapa →
                    </span>
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

                {p.estado === 'LISTO' && !p.domiciliario_id ? (
                  <button
                    onClick={() => tomarPedido(p.id)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg"
                  >
                    Tomar este pedido
                  </button>
                ) : p.estado === 'LISTO' && p.domiciliario_id === userId ? (
                  <button
                    onClick={() => iniciarEntrega(p.id)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg"
                  >
                    🚀 Iniciar entrega
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
            )
          })
        )}
      </div>
    </div>
  )
}
