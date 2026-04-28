'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Cuadre = {
  desde: string
  hasta: string
  total_ventas: number
  cantidad_ventas: number
  cantidad_canceladas: number
  total_descuentos: number
  total_iva: number
  total_domicilios: number
  por_metodo_pago: Record<string, { total: number; cantidad: number }>
  detalle_items: Array<{
    producto: string
    codigo: string
    cantidad: number
    total: number
  }>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function CuadreActual({ cajaId }: { cajaId: string }) {
  const supabase = createClient()
  const [cuadre, setCuadre] = useState<Cuadre | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.rpc('cuadre_actual', { p_caja_id: cajaId })
    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }
    setCuadre(data as any)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line
  }, [cajaId])

  if (cargando && !cuadre) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-3 border-4 border-[var(--bg-subtle)] border-t-[var(--brand)] rounded-full animate-spin" />
        <p className="text-[var(--text-muted)]">Calculando cuadre...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-4 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!cuadre) return null

  const totalPorMetodo = Object.values(cuadre.por_metodo_pago).reduce(
    (acc, v: any) => acc + Number(v.total),
    0
  )

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">
            Cuadre en tiempo real
          </p>
          <h1 className="font-display text-4xl">
            ¿Cómo va <em>tu turno</em>?
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Desde {new Date(cuadre.desde).toLocaleString('es-CO')}
          </p>
        </div>
        <button
          onClick={cargar}
          className="btn btn-ghost text-sm !py-2"
        >
          🔄 Refrescar
        </button>
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <KpiCard
          label="Total ventas"
          value={fmt(Number(cuadre.total_ventas))}
          icon="💰"
          gradient="from-[var(--brand)] to-orange-600"
          wide
        />
        <KpiCard
          label="Transacciones"
          value={String(cuadre.cantidad_ventas)}
          icon="🧾"
          gradient="from-blue-500 to-indigo-600"
        />
        <KpiCard
          label="IVA cobrado"
          value={fmt(Number(cuadre.total_iva))}
          icon="📊"
          gradient="from-purple-500 to-pink-600"
        />
        <KpiCard
          label="Domicilios"
          value={fmt(Number(cuadre.total_domicilios))}
          icon="🛵"
          gradient="from-amber-500 to-orange-500"
          wide
        />
      </motion.div>

      {/* Por método */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
          <h2 className="font-bold text-lg">💳 Por método de pago</h2>
        </div>
        {totalPorMetodo === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-2">📭</div>
            <p className="text-[var(--text-muted)]">
              Aún no hay cobros en este turno
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-muted)] font-bold">
                  <th className="text-left py-2 px-4">Método</th>
                  <th className="text-right py-2 px-4">#</th>
                  <th className="text-right py-2 px-4">Total</th>
                  <th className="text-right py-2 px-4">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cuadre.por_metodo_pago).map(([m, info]: any, i) => {
                  const total = Number(info.total)
                  const pct =
                    totalPorMetodo > 0
                      ? ((total / totalPorMetodo) * 100).toFixed(1)
                      : '0.0'
                  return (
                    <motion.tr
                      key={m}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-3 px-4 font-semibold">{m}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {info.cantidad}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold">
                        {fmt(total)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-muted)]">
                        {pct}%
                      </td>
                    </motion.tr>
                  )
                })}
                <tr className="bg-[var(--bg-subtle)] font-bold">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4 text-right">{cuadre.cantidad_ventas}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-display text-lg">
                    {fmt(totalPorMetodo)}
                  </td>
                  <td className="py-3 px-4 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* Productos vendidos */}
      {cuadre.detalle_items.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
            <h2 className="font-bold text-lg">🍕 Productos vendidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-muted)] font-bold">
                  <th className="text-left py-2 px-4">Código</th>
                  <th className="text-left py-2 px-3">Producto</th>
                  <th className="text-right py-2 px-3">Cant.</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {cuadre.detalle_items.map((it, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {it.codigo}
                    </td>
                    <td className="py-2 px-3 font-medium">{it.producto}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {it.cantidad}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums font-bold">
                      {fmt(Number(it.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      )}

      {(cuadre.cantidad_canceladas > 0 || Number(cuadre.total_descuentos) > 0) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {cuadre.cantidad_canceladas > 0 && (
            <div className="card p-3 bg-red-50 dark:bg-red-950/30 !border-red-300 dark:!border-red-800">
              <p className="text-xs text-[var(--text-muted)] uppercase">
                Canceladas
              </p>
              <p className="font-display text-2xl text-red-600 dark:text-red-400">
                {cuadre.cantidad_canceladas}
              </p>
            </div>
          )}
          {Number(cuadre.total_descuentos) > 0 && (
            <div className="card p-3 bg-purple-50 dark:bg-purple-950/30 !border-purple-300 dark:!border-purple-800">
              <p className="text-xs text-[var(--text-muted)] uppercase">
                Descuentos
              </p>
              <p className="font-display text-2xl text-purple-600 dark:text-purple-400">
                {fmt(Number(cuadre.total_descuentos))}
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-center text-[var(--text-muted)] italic">
        Solo el ADMIN puede cerrar la caja para generar el reporte definitivo.
      </p>
    </main>
  )
}

function KpiCard({
  label,
  value,
  icon,
  gradient,
  wide,
}: {
  label: string
  value: string
  icon: string
  gradient: string
  wide?: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -4 }}
      className={`card p-5 relative overflow-hidden ${wide ? 'col-span-2' : ''}`}
    >
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">
            {label}
          </p>
          <span className="text-xl">{icon}</span>
        </div>
        <p className="font-display text-2xl tabular-nums">{value}</p>
      </div>
    </motion.div>
  )
}
