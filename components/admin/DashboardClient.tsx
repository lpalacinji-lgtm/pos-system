'use client'

import { motion } from 'framer-motion'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

type InsumoCritico = {
  id: string
  nombre: string
  stock_actual: number
  unidad: string
  stock_minimo: number
}

type VentaPeriodo = {
  caja_nombre: string
  metodo_pago: string
  num_ventas: number
  total: number
}

export default function DashboardClient({
  totalHoy,
  cantidadHoy,
  total7d,
  insumosCriticos,
  ventasHoy,
  errorMsg,
}: {
  totalHoy: number
  cantidadHoy: number
  total7d: number
  insumosCriticos: InsumoCritico[]
  ventasHoy: VentaPeriodo[]
  errorMsg: string | null
}) {
  const ticketPromedio = cantidadHoy > 0 ? totalHoy / cantidadHoy : 0

  return (
    <div className="p-6 lg:p-8 space-y-6 pt-20 md:pt-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">
          Resumen del día
        </p>
        <h1 className="font-display text-5xl text-balance">
          <em>Hola</em>, esto es <em>hoy</em>.
        </h1>
      </motion.div>

      {errorMsg && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-200">
          ⚠ {errorMsg}
        </div>
      )}

      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Ventas hoy"
          value={fmt(totalHoy)}
          sub={`${cantidadHoy} ${cantidadHoy === 1 ? 'transacción' : 'transacciones'}`}
          gradient="from-[var(--brand)] to-orange-600"
          icon="💰"
        />
        <KpiCard
          label="Últimos 7 días"
          value={fmt(total7d)}
          sub="Ingresos brutos"
          gradient="from-blue-500 to-indigo-600"
          icon="📈"
        />
        <KpiCard
          label="Ticket promedio"
          value={cantidadHoy > 0 ? fmt(ticketPromedio) : '—'}
          sub="Por venta hoy"
          gradient="from-purple-500 to-pink-600"
          icon="🎫"
        />
        <KpiCard
          label="Stock crítico"
          value={String(insumosCriticos.length)}
          sub="Insumos por debajo del mínimo"
          gradient={
            insumosCriticos.length > 0
              ? 'from-red-500 to-rose-600'
              : 'from-emerald-500 to-teal-600'
          }
          icon={insumosCriticos.length > 0 ? '⚠️' : '✅'}
        />
      </motion.div>

      {/* Stock crítico */}
      {insumosCriticos.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
        >
          <h3 className="font-bold text-lg flex items-center gap-2 mb-3 text-red-700 dark:text-red-400">
            ⚠️ Stock crítico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {insumosCriticos.slice(0, 6).map((i, idx) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                className="flex justify-between items-center bg-[var(--bg-elevated)] rounded-xl px-3 py-2 border border-[var(--border)]"
              >
                <span className="font-medium">{i.nombre}</span>
                <span className="font-mono text-red-600 dark:text-red-400 font-bold">
                  {i.stock_actual} {i.unidad}
                </span>
              </motion.div>
            ))}
          </div>
          {insumosCriticos.length > 6 && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              + {insumosCriticos.length - 6} insumos más
            </p>
          )}
        </motion.section>
      )}

      {/* Ventas por método */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5"
      >
        <h2 className="font-display text-2xl mb-4">
          Ventas por método de pago <em>hoy</em>
        </h2>
        {ventasHoy.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-2">📭</div>
            <p className="text-[var(--text-muted)]">Sin ventas registradas hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="text-left py-2">Caja</th>
                  <th className="text-left py-2">Método</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasHoy.map((r, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 font-medium">{r.caja_nombre}</td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      <span className="badge bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {r.metodo_pago}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">{r.num_ventas}</td>
                    <td className="py-3 text-right font-bold tabular-nums">
                      {fmt(Number(r.total))}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  gradient,
  icon,
}: {
  label: string
  value: string
  sub: string
  gradient: string
  icon: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -4 }}
      className="card p-5 relative overflow-hidden"
    >
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">
            {label}
          </p>
          <span className="text-xl">{icon}</span>
        </div>
        <p className="font-display text-3xl mb-1 tabular-nums">{value}</p>
        <p className="text-xs text-[var(--text-muted)]">{sub}</p>
      </div>
    </motion.div>
  )
}
