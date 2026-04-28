'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const cantidadAnterior = useRef(0)

  useEffect(() => {
    cargarListos()
    // eslint-disable-next-line
  }, [cajaId])

  const cargarListos = async () => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('ventas')
      .select(`id, numero_consecutivo, es_domicilio, total, cliente:clientes(nombre)`)
      .eq('caja_id', cajaId)
      .eq('estado', 'LISTO')
      .eq('es_domicilio', false)
      .gte('created_at', hoy.toISOString())
      .order('listo_at', { ascending: true })

    if (data) {
      const lista = data.map((v: any) => ({
        id: v.id,
        numero_consecutivo: v.numero_consecutivo,
        es_domicilio: v.es_domicilio,
        cliente_nombre: v.cliente?.nombre ?? null,
        total: Number(v.total),
      }))
      // Beep si entró nuevo
      if (lista.length > cantidadAnterior.current && cantidadAnterior.current >= 0) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.start()
          osc.stop(ctx.currentTime + 0.3)
        } catch {}
      }
      cantidadAnterior.current = lista.length
      setListos(lista)
    }
  }

  useEffect(() => {
    const ch = supabase
      .channel('cajera-listos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas', filter: `caja_id=eq.${cajaId}` },
        () => cargarListos()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line
  }, [cajaId])

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
      alert('Error: ' + error.message)
      return
    }
    setListos((prev) => prev.filter((p) => p.id !== id))
  }

  if (listos.length === 0) return null

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-[64px] z-20"
    >
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold flex items-center justify-between hover:from-amber-500 hover:to-amber-600 transition shadow-lg"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-700 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-700" />
          </span>
          <span>
            🔔 {listos.length} pedido{listos.length !== 1 ? 's' : ''} listo
            {listos.length !== 1 ? 's' : ''} para entregar
          </span>
        </span>
        <span className="text-sm">{expandido ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-[var(--bg-elevated)] border-b border-[var(--border)] shadow-lg"
          >
            <div className="max-h-[60vh] overflow-y-auto">
              <AnimatePresence>
                {listos.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-subtle)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl">
                          #{p.numero_consecutivo}
                        </span>
                        {p.cliente_nombre && (
                          <span className="text-sm text-[var(--text-secondary)] truncate">
                            {p.cliente_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] tabular-nums">
                        {fmt(p.total)}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => entregar(p.id)}
                      disabled={entregando === p.id}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap"
                    >
                      {entregando === p.id ? '...' : '✓ Entregado'}
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
