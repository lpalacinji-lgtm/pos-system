'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Venta = {
  id: string
  numero_consecutivo: number
  created_at: string
  estado: string
  metodo_pago: string
  tipo_factura: string
  total: number
  valor_domicilio: number | null
  es_domicilio: boolean
  direccion_entrega: string | null
  domiciliario_id: string | null
  domiciliario: { nombre: string } | null
  cliente: { nombre: string | null; nit: string | null } | null
}

type Domiciliario = { id: string; nombre: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  EN_COCINA: { label: 'En cocina', bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
  LISTO: { label: 'Listo', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
  EN_RUTA: { label: 'En ruta', bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
  ENTREGADO: { label: 'Entregado', bg: 'bg-emerald-500', text: 'text-white' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300' },
}

export default function HistorialModule({
  ventas: ventasIniciales,
  domiciliarios,
  cajaId: _cajaId,
}: {
  ventas: Venta[]
  domiciliarios: Domiciliario[]
  cajaId: string
}) {
  const supabase = createClient()
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales)
  const [reasignandoId, setReasignandoId] = useState<string | null>(null)
  const [nuevoDomi, setNuevoDomi] = useState<string>('')
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [motivoCancel, setMotivoCancel] = useState('')

  const reimprimir = (id: string) =>
    window.open(`/recibo/${id}`, '_blank', 'width=420,height=720')

  const reasignar = async (ventaId: string) => {
    if (!nuevoDomi) return
    const { error } = await supabase
      .from('ventas')
      .update({ domiciliario_id: nuevoDomi })
      .eq('id', ventaId)
    if (error) return alert('Error: ' + error.message)
    const domi = domiciliarios.find((d) => d.id === nuevoDomi)
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId
          ? {
              ...v,
              domiciliario_id: nuevoDomi,
              domiciliario: domi ? { nombre: domi.nombre } : null,
            }
          : v
      )
    )
    setReasignandoId(null)
    setNuevoDomi('')
  }

  const cancelar = async (ventaId: string) => {
    const { error } = await supabase
      .from('ventas')
      .update({
        estado: 'CANCELADO',
        observaciones: motivoCancel || null,
      })
      .eq('id', ventaId)
    if (error) return alert('Error: ' + error.message)
    setVentas((prev) =>
      prev.map((v) => (v.id === ventaId ? { ...v, estado: 'CANCELADO' } : v))
    )
    setCancelandoId(null)
    setMotivoCancel('')
  }

  const totalDia = ventas
    .filter((v) => v.estado !== 'CANCELADO')
    .reduce((acc, v) => acc + Number(v.total), 0)
  const cantidadDia = ventas.filter((v) => v.estado !== 'CANCELADO').length

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <KpiCard
          label="Ventas hoy"
          value={fmt(totalDia)}
          icon="💰"
          gradient="from-[var(--brand)] to-orange-600"
        />
        <KpiCard
          label="Transacciones"
          value={String(cantidadDia)}
          icon="🧾"
          gradient="from-blue-500 to-indigo-600"
        />
        <KpiCard
          label="Ticket promedio"
          value={cantidadDia > 0 ? fmt(totalDia / cantidadDia) : '—'}
          icon="🎫"
          gradient="from-purple-500 to-pink-600"
        />
      </motion.div>

      {/* Lista */}
      {ventas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center"
        >
          <div className="text-6xl mb-3">📭</div>
          <p className="font-display text-2xl mb-1">Sin ventas hoy</p>
          <p className="text-sm text-[var(--text-muted)]">
            Las ventas que cobres aparecerán aquí
          </p>
        </motion.div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)] font-bold">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-3">Hora</th>
                  <th className="text-left py-3 px-3">Cliente</th>
                  <th className="text-left py-3 px-3">Estado</th>
                  <th className="text-left py-3 px-3">Pago</th>
                  <th className="text-left py-3 px-3">Domiciliario</th>
                  <th className="text-right py-3 px-3">Total</th>
                  <th className="text-center py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, i) => {
                  const config = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.PENDIENTE
                  const cancelable = !['ENTREGADO', 'CANCELADO'].includes(v.estado)
                  return (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-[var(--border)] hover:bg-[var(--bg-subtle)] transition"
                    >
                      <td className="py-3 px-4 font-display text-xl">
                        {v.numero_consecutivo}
                      </td>
                      <td className="py-3 px-3 text-sm text-[var(--text-secondary)] tabular-nums">
                        {new Date(v.created_at).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {v.cliente?.nombre ?? (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                        {v.cliente?.nit && (
                          <span className="block text-xs text-[var(--text-muted)]">
                            {v.cliente.nit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`badge ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs uppercase text-[var(--text-secondary)]">
                        {v.metodo_pago}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {v.es_domicilio ? (
                          reasignandoId === v.id ? (
                            <div className="flex gap-1">
                              <select
                                value={nuevoDomi}
                                onChange={(e) => setNuevoDomi(e.target.value)}
                                className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 flex-1 bg-[var(--bg-elevated)]"
                              >
                                <option value="">— Selecciona —</option>
                                {domiciliarios.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.nombre}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => reasignar(v.id)}
                                className="bg-emerald-500 text-white text-xs px-2 rounded-lg"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setReasignandoId(null)
                                  setNuevoDomi('')
                                }}
                                className="bg-[var(--bg-subtle)] text-xs px-2 rounded-lg"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReasignandoId(v.id)
                                setNuevoDomi(v.domiciliario_id ?? '')
                              }}
                              className="text-left hover:text-[var(--brand)] transition"
                              title="Click para reasignar"
                            >
                              {v.domiciliario?.nombre ?? (
                                <span className="text-amber-600 dark:text-amber-400 underline decoration-dotted">
                                  Sin asignar
                                </span>
                              )}{' '}
                              <span className="text-xs opacity-60">✏️</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold font-display text-lg">
                        {fmt(Number(v.total))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => reimprimir(v.id)}
                            className="text-[var(--brand)] hover:bg-[var(--brand-soft)] text-sm rounded-lg p-1.5 transition"
                            title="Reimprimir"
                          >
                            🖨️
                          </button>
                          {cancelable && (
                            <button
                              onClick={() => setCancelandoId(v.id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm rounded-lg p-1.5 transition"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal cancelar */}
      <AnimatePresence>
        {cancelandoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setCancelandoId(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-elevated)] rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">⚠️</div>
                <h3 className="font-display text-2xl">¿Cancelar esta venta?</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Esta acción no se puede deshacer. El inventario no se devuelve automáticamente.
                </p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                  Motivo (opcional)
                </label>
                <textarea
                  value={motivoCancel}
                  onChange={(e) => setMotivoCancel(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Cliente se arrepintió, error en pedido..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCancelandoId(null)
                    setMotivoCancel('')
                  }}
                  className="btn btn-ghost flex-1"
                >
                  No, mantener
                </button>
                <button
                  onClick={() => cancelar(cancelandoId)}
                  className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Sí, cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string
  value: string
  icon: string
  gradient: string
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
        <p className="font-display text-3xl tabular-nums">{value}</p>
      </div>
    </motion.div>
  )
}
