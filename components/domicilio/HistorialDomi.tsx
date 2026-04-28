'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Entrega = {
  id: string
  numero: number
  entregado_at: string
  en_ruta_at: string | null
  direccion: string | null
  total: number
  valor_domicilio: number
  tiempo_seg: number | null
  metodo_pago: string
  cliente_nombre: string | null
}

type Reporte = {
  desde: string
  hasta: string
  total_entregas: number
  total_ventas: number
  total_domicilios: number
  tiempo_promedio_seg: number
  entregas: Entrega[]
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const fmtTiempo = (seg: number | null) => {
  if (!seg) return '—'
  const m = Math.floor(seg / 60)
  return `${m} min`
}

type RangoTipo = 'hoy' | 'semana' | 'mes' | 'custom'

function getRango(tipo: RangoTipo, desdeCustom?: string, hastaCustom?: string) {
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)

  switch (tipo) {
    case 'hoy':
      return { desde: hoy, hasta: manana }
    case 'semana': {
      const desde = new Date(hoy)
      desde.setDate(hoy.getDate() - 6)
      return { desde, hasta: manana }
    }
    case 'mes': {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
      return { desde, hasta }
    }
    case 'custom': {
      const desde = desdeCustom ? new Date(desdeCustom) : hoy
      const hasta = hastaCustom
        ? new Date(new Date(hastaCustom).getTime() + 24 * 60 * 60 * 1000)
        : manana
      return { desde, hasta }
    }
  }
}

export default function HistorialDomi() {
  const supabase = createClient()
  const [tipo, setTipo] = useState<RangoTipo>('hoy')
  const [desdeCustom, setDesdeCustom] = useState('')
  const [hastaCustom, setHastaCustom] = useState('')
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    const { desde, hasta } = getRango(tipo, desdeCustom, hastaCustom)
    const { data, error } = await supabase.rpc('reporte_domiciliario', {
      p_desde: desde.toISOString(),
      p_hasta: hasta.toISOString(),
    })
    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }
    setReporte(data as any)
    setCargando(false)
  }

  useEffect(() => {
    if (tipo !== 'custom' || (desdeCustom && hastaCustom)) cargar()
    // eslint-disable-next-line
  }, [tipo, desdeCustom, hastaCustom])

  const descargarPdf = () => {
    // Abre nueva pestaña con vista imprimible
    const params = new URLSearchParams({
      tipo,
      desde: desdeCustom,
      hasta: hastaCustom,
    })
    window.open(`/domicilio/reporte?${params.toString()}`, '_blank')
  }

  return (
    <div className="pb-24 min-h-screen bg-[var(--bg)]">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl">Historial</h2>
          <button
            onClick={descargarPdf}
            disabled={!reporte || reporte.total_entregas === 0}
            className="btn btn-primary text-sm !py-2 !px-4 disabled:bg-[var(--border)]"
          >
            📄 Reporte PDF
          </button>
        </div>

        {/* Selector de rango */}
        <div className="card p-3">
          <div className="grid grid-cols-4 gap-2">
            {(['hoy', 'semana', 'mes', 'custom'] as RangoTipo[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  tipo === t
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {t === 'hoy' && 'Hoy'}
                {t === 'semana' && '7 días'}
                {t === 'mes' && 'Mes'}
                {t === 'custom' && 'Rango'}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {tipo === 'custom' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-2 mt-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-semibold">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={desdeCustom}
                    onChange={(e) => setDesdeCustom(e.target.value)}
                    className="input mt-1 text-sm !py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-semibold">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={hastaCustom}
                    onChange={(e) => setHastaCustom(e.target.value)}
                    className="input mt-1 text-sm !py-2"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {cargando && (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            Cargando reporte...
          </div>
        )}

        {error && (
          <div className="card p-4 bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 dark:text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {reporte && !cargando && (
          <>
            {/* KPIs */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06 } },
              }}
              className="grid grid-cols-2 gap-3"
            >
              <KpiCard
                label="Entregas"
                value={reporte.total_entregas.toString()}
                emoji="🛵"
                color="from-[var(--brand)] to-orange-600"
              />
              <KpiCard
                label="Tiempo prom."
                value={
                  reporte.total_entregas > 0
                    ? `${Math.floor(reporte.tiempo_promedio_seg / 60)} min`
                    : '—'
                }
                emoji="⏱"
                color="from-blue-500 to-indigo-600"
              />
              <KpiCard
                label="Ventas cobradas"
                value={fmtCOP(Number(reporte.total_ventas))}
                emoji="💰"
                color="from-emerald-500 to-teal-600"
                wide
              />
              <KpiCard
                label="Domicilios"
                value={fmtCOP(Number(reporte.total_domicilios))}
                emoji="📦"
                color="from-amber-500 to-orange-500"
                wide
              />
            </motion.div>

            {/* Lista de entregas */}
            {reporte.entregas.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-6xl mb-3">📋</div>
                <p className="font-semibold mb-1">Sin entregas en este rango</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Prueba con otro periodo
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide px-1">
                  Entregas
                </h3>
                {reporte.entregas.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="card p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold">#{e.numero}</span>
                        {e.cliente_nombre && (
                          <span className="text-sm text-[var(--text-muted)] truncate">
                            · {e.cliente_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {e.direccion ?? '—'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(e.entregado_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {fmtTiempo(e.tiempo_seg)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm tabular-nums">
                        {fmtCOP(Number(e.total))}
                      </p>
                      {Number(e.valor_domicilio) > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          +{fmtCOP(Number(e.valor_domicilio))} domi
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-elevated)] border-t border-[var(--border)] safe-bottom z-30 glass">
        <div className="flex">
          <Link
            href="/domicilio"
            className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--text-muted)]"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-bold">Inicio</span>
          </Link>
          <Link
            href="/domicilio/historial"
            className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--brand)]"
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
    </div>
  )
}

function KpiCard({
  label,
  value,
  emoji,
  color,
  wide,
}: {
  label: string
  value: string
  emoji: string
  color: string
  wide?: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      className={`card p-4 relative overflow-hidden ${wide ? 'col-span-2' : ''}`}
    >
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-10`}
      />
      <div className="relative">
        <div className="text-2xl mb-1">{emoji}</div>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
      </div>
    </motion.div>
  )
}
