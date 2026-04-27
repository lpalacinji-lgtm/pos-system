'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PedidoListo = {
  id: string
  numero_consecutivo: number
  es_domicilio: boolean
  cliente_nombre: string | null
  total: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function BannerListos({ cajaId }: { cajaId: string }) {
  const supabase = createClient()
  const [listos, setListos] = useState<PedidoListo[]>([])
  const [expandido, setExpandido] = useState(false)
  const [entregando, setEntregando] = useState<string | null>(null)

  // Carga inicial
  useEffect(() => {
    cargarListos()
    // eslint-disable-next-line
  }, [cajaId])

  const cargarListos = async () => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('ventas')
      .select(
        `id, numero_consecutivo, es_domicilio, total,
         cliente:clientes(nombre)`
      )
      .eq('caja_id', cajaId)
      .eq('estado', 'LISTO')
      .eq('es_domicilio', false)
      .gte('created_at', hoy.toISOString())
      .order('listo_at', { ascending: true })

    if (data) {
      setListos(
        data.map((v: any) => ({
          id: v.id,
          numero_consecutivo: v.numero_consecutivo,
          es_domicilio: v.es_domicilio,
          cliente_nombre: v.cliente?.nombre ?? null,
          total: Number(v.total),
        }))
      )
    }
  }

  // Realtime: escuchar cambios de ventas en esta caja
  useEffect(() => {
    const channel = supabase
      .channel('cajera-listos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas',
          filter: `caja_id=eq.${cajaId}`,
        },
        () => {
          cargarListos()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line
  }, [cajaId])

  // Beep cuando entra un nuevo pedido (cantidad sube)
  const cantidadPrevia = useEffectCantidad(listos.length)
  useEffect(() => {
    if (listos.length > cantidadPrevia && cantidadPrevia >= 0) {
      try {
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      } catch {
        // ignorar errores de audio
      }
    }
    // eslint-disable-next-line
  }, [listos.length])

  const entregar = async (id: string) => {
    setEntregando(id)
    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'ENTREGADO',
        entregado_at: new Date().toISOString(),
      })
      .eq('id', id)
    setEntregando(null)
    if (error) {
      alert('Error al entregar: ' + error.message)
      return
    }
    setListos((prev) => prev.filter((p) => p.id !== id))
  }

  if (listos.length === 0) return null

  return (
    <div className="sticky top-[56px] z-30 bg-amber-400 text-amber-950 shadow-lg">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-amber-500 transition"
      >
        <span className="flex items-center gap-2 font-bold">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-700 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-700" />
          </span>
          🔔 {listos.length} pedido{listos.length !== 1 ? 's' : ''} listo
          {listos.length !== 1 ? 's' : ''} para entregar
        </span>
        <span className="text-sm">{expandido ? '▲ Ocultar' : '▼ Ver detalle'}</span>
      </button>

      {expandido && (
        <div className="bg-white border-t border-amber-300 max-h-[60vh] overflow-y-auto">
          {listos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-800">
                    #{p.numero_consecutivo}
                  </span>
                  {p.cliente_nombre && (
                    <span className="text-sm text-gray-600 truncate">
                      {p.cliente_nombre}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{fmt(p.total)}</p>
              </div>
              <button
                onClick={() => entregar(p.id)}
                disabled={entregando === p.id}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap"
              >
                {entregando === p.id ? '...' : '✓ Entregado'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook simple para tener el valor anterior
function useEffectCantidad(cantidad: number) {
  const [prev, setPrev] = useState(-1)
  useEffect(() => {
    setPrev(cantidad)
  }, [cantidad])
  return prev
}
