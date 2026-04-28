'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import BannerListos from '@/components/caja/BannerListos'
import ClienteFormFields, { ClienteData } from '@/components/caja/ClienteFormFields'
import { ThemeToggle } from '@/components/ThemeProvider'

type Producto = {
  id: string
  codigo: string
  nombre: string
  precio: number
  iva_porcentaje: number
  categoria_id: string | null
  categoria?: { nombre: string } | null
}
type Categoria = { id: string; nombre: string }
type Domiciliario = { id: string; nombre: string; telefono: string | null }
type ItemCarrito = { producto: Producto; cantidad: number; observacion?: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const clienteVacio: ClienteData = {
  nit: '',
  nombre: '',
  telefono: '',
  email: '',
  persona_tipo: 'NATURAL',
  tipo_documento: 'CC',
}

export default function POSCaja({
  caja,
  productos,
  categorias,
  domiciliarios,
  profile,
}: {
  caja: any
  productos: Producto[]
  categorias: Categoria[]
  domiciliarios: Domiciliario[]
  profile: any
}) {
  const supabase = createClient()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cliente, setCliente] = useState<ClienteData>(clienteVacio)
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [esDomicilio, setEsDomicilio] = useState(false)
  const [direccion, setDireccion] = useState('')
  const [valorDomicilio, setValorDomicilio] = useState<string>('5000')
  const [domiciliarioId, setDomiciliarioId] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO')
  const [tipoFactura, setTipoFactura] = useState<'POS' | 'ELECTRONICA'>('POS')
  const [procesando, setProcesando] = useState(false)
  const [showCobro, setShowCobro] = useState(false)

  const productosFiltrados = useMemo(() => {
    let list = productos
    if (categoriaActiva) list = list.filter((p) => p.categoria_id === categoriaActiva)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      list = list.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      )
    }
    return list
  }, [productos, categoriaActiva, busqueda])

  const totales = useMemo(() => {
    let subtotal = 0
    let iva = 0
    carrito.forEach((it) => {
      const lineSub = it.producto.precio * it.cantidad
      subtotal += lineSub
      iva += (lineSub * Number(it.producto.iva_porcentaje)) / 100
    })
    const valDom = esDomicilio ? Number(valorDomicilio) || 0 : 0
    return { subtotal, iva, valorDomicilio: valDom, total: subtotal + iva + valDom }
  }, [carrito, esDomicilio, valorDomicilio])

  const agregar = (p: Producto) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.producto.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        return next
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev.flatMap((i) => {
        if (i.producto.id !== id) return [i]
        const nueva = i.cantidad + delta
        return nueva <= 0 ? [] : [{ ...i, cantidad: nueva }]
      })
    )
  }

  const quitar = (id: string) =>
    setCarrito((prev) => prev.filter((i) => i.producto.id !== id))

  const buscarCliente = async () => {
    if (!cliente.nit?.trim()) return
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('nit', cliente.nit.trim())
      .maybeSingle()
    if (data) {
      setCliente(data as any)
      setClienteEncontrado(true)
    } else {
      setClienteEncontrado(false)
    }
  }

  const cobrar = async () => {
    if (carrito.length === 0) return alert('Carrito vacío')
    if (esDomicilio && !direccion.trim()) return alert('Falta dirección de entrega')
    if (tipoFactura === 'ELECTRONICA') {
      if (!cliente.nit?.trim() || !cliente.nombre?.trim() || !cliente.email?.trim()) {
        return alert('Factura electrónica requiere documento, nombre y email')
      }
    }

    setProcesando(true)
    try {
      let clienteId: string | null = cliente.id ?? null

      if (cliente.nit?.trim() && cliente.nombre?.trim()) {
        const payload: any = {
          nit: cliente.nit.trim(),
          nombre: cliente.nombre.trim(),
          telefono: cliente.telefono || null,
          email: cliente.email || null,
          persona_tipo: cliente.persona_tipo || 'NATURAL',
          tipo_documento: cliente.tipo_documento || 'CC',
        }
        if (tipoFactura === 'ELECTRONICA') {
          payload.razon_social = cliente.razon_social || cliente.nombre
          payload.digito_verificacion = cliente.digito_verificacion || null
          payload.direccion = cliente.direccion || null
          payload.departamento = cliente.departamento || null
          payload.municipio = cliente.municipio || null
          payload.regimen_iva = cliente.regimen_iva || 'NO_RESPONSABLE'
          payload.actividad_ciiu = cliente.actividad_ciiu || null
        }
        const { data: upserted, error } = await supabase
          .from('clientes')
          .upsert(payload, { onConflict: 'nit' })
          .select('id')
          .single()
        if (error) throw error
        clienteId = upserted.id
      }

      const items = carrito.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        observacion: it.observacion || null,
      }))

      const { data: ventaId, error } = await supabase.rpc('crear_venta', {
        p_caja_id: caja.id,
        p_cliente_id: clienteId,
        p_metodo_pago: metodoPago,
        p_tipo_factura: tipoFactura,
        p_es_domicilio: esDomicilio,
        p_direccion_entrega: esDomicilio ? direccion : null,
        p_items: items,
        p_valor_domicilio: esDomicilio ? Number(valorDomicilio) || 0 : 0,
        p_domiciliario_id: esDomicilio && domiciliarioId ? domiciliarioId : null,
        p_observaciones: null,
      })

      if (error) throw error

      window.open(`/recibo/${ventaId}`, '_blank', 'width=420,height=720')

      // Reset
      setCarrito([])
      setCliente(clienteVacio)
      setClienteEncontrado(false)
      setEsDomicilio(false)
      setDireccion('')
      setValorDomicilio('5000')
      setDomiciliarioId('')
      setShowCobro(false)
    } catch (err: any) {
      alert('❌ Error: ' + err.message)
    } finally {
      setProcesando(false)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] px-5 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-orange-600 flex items-center justify-center text-white text-xl">
            🛒
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">{caja.nombre}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {profile.nombre} · {caja.ubicacion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/caja/${caja.id}/cuadre`}
            className="btn btn-ghost text-sm !py-2 hidden md:inline-flex"
          >
            📊 Cuadre
          </Link>
          <Link
            href={`/caja/${caja.id}/historial`}
            className="btn btn-ghost text-sm !py-2 hidden md:inline-flex"
          >
            📜 Historial
          </Link>
          <ThemeToggle />
          <button onClick={cerrarSesion} className="btn btn-ghost text-sm !py-2">
            Salir
          </button>
        </div>
      </header>

      {/* Banner pedidos listos */}
      <BannerListos cajaId={caja.id} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] overflow-hidden">
        {/* Productos */}
        <main className="p-4 overflow-y-auto">
          {/* Búsqueda */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Buscar producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              🔍
            </span>
          </div>

          {/* Categorías */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition ${
                !categoriaActiva
                  ? 'bg-[var(--brand)] text-white shadow-md'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >
              ✨ Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoriaActiva(c.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition ${
                  categoriaActiva === c.id
                    ? 'bg-[var(--brand)] text-white shadow-md'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            {productosFiltrados.map((p) => (
              <motion.button
                key={p.id}
                layout
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => agregar(p)}
                className="card text-left p-3 hover:border-[var(--brand)] hover:shadow-lg transition group"
              >
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                  {p.codigo}
                </p>
                <p className="font-bold text-sm text-[var(--text)] line-clamp-2 mt-1 mb-2 leading-tight">
                  {p.nombre}
                </p>
                <p className="font-display text-xl text-[var(--brand)]">
                  {fmt(p.precio)}
                </p>
                {p.iva_porcentaje > 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    + IVA {p.iva_porcentaje}%
                  </p>
                )}
              </motion.button>
            ))}
          </motion.div>
        </main>

        {/* Carrito */}
        <aside className="bg-[var(--bg-elevated)] border-l border-[var(--border)] flex flex-col max-h-[calc(100vh-72px)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-display text-2xl flex items-center gap-2">
              🛒 <span>Pedido</span>
              {carrito.length > 0 && (
                <span className="ml-auto badge bg-[var(--brand)] text-white">
                  {carrito.length}
                </span>
              )}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {carrito.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-5xl mb-3"
                >
                  🛍️
                </motion.div>
                <p className="text-sm text-[var(--text-muted)]">
                  Toca un producto para agregarlo
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {carrito.map((it) => (
                  <motion.div
                    key={it.producto.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[var(--bg-subtle)] rounded-2xl p-3 flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {it.producto.nombre}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {fmt(it.producto.precio)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-full p-0.5">
                      <button
                        onClick={() => cambiarCantidad(it.producto.id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-[var(--border)] rounded-full"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold tabular-nums text-sm">
                        {it.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(it.producto.id, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-[var(--brand)] text-white rounded-full hover:bg-[var(--brand-dark)]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => quitar(it.producto.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Totales */}
          <div className="border-t border-[var(--border)] p-4 space-y-2 bg-[var(--bg-elevated)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="tabular-nums font-semibold">{fmt(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">IVA</span>
              <span className="tabular-nums font-semibold">{fmt(totales.iva)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold pt-2 border-t border-[var(--border)]">
              <span>Total</span>
              <span className="text-[var(--brand)] tabular-nums font-display">
                {fmt(totales.total)}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCobro(true)}
              disabled={carrito.length === 0}
              className="btn btn-primary w-full !py-4 text-base mt-2 disabled:!bg-[var(--border)] disabled:!shadow-none"
            >
              💳 Cobrar {fmt(totales.total)}
            </motion.button>

            {/* Móvil: links extra */}
            <div className="grid grid-cols-2 gap-2 md:hidden pt-2">
              <Link
                href={`/caja/${caja.id}/cuadre`}
                className="btn btn-ghost text-xs !py-2"
              >
                📊 Cuadre
              </Link>
              <Link
                href={`/caja/${caja.id}/historial`}
                className="btn btn-ghost text-xs !py-2"
              >
                📜 Historial
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal cobro */}
      <AnimatePresence>
        {showCobro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowCobro(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[var(--bg-elevated)] rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Total a cobrar</p>
                  <h3 className="font-display text-4xl text-[var(--brand)]">
                    {fmt(totales.total)}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCobro(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Tipo factura */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-2">
                    Tipo de factura
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['POS', 'ELECTRONICA'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipoFactura(t)}
                        className={`py-3 rounded-xl font-semibold text-sm transition ${
                          tipoFactura === t
                            ? 'bg-[var(--brand)] text-white'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {t === 'POS' ? '🧾 POS' : '📋 Electrónica'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buscar cliente */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-2">
                    Cliente
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={cliente.nit}
                      onChange={(e) => setCliente({ ...cliente, nit: e.target.value })}
                      placeholder="Cédula / NIT"
                      className="input flex-1"
                    />
                    <button
                      onClick={buscarCliente}
                      className="btn btn-ghost px-4 !py-2 text-sm"
                    >
                      🔍 Buscar
                    </button>
                  </div>
                </div>

                {clienteEncontrado && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 text-sm"
                  >
                    ✓ Cliente: <strong>{cliente.nombre}</strong>
                  </motion.div>
                )}

                {/* Form cliente */}
                <ClienteFormFields
                  tipoFactura={tipoFactura}
                  cliente={cliente}
                  onChange={setCliente}
                />

                {/* Método pago */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-2">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'EFECTIVO', l: '💵 Efectivo' },
                      { v: 'TARJETA', l: '💳 Tarjeta' },
                      { v: 'NEQUI', l: 'Nequi' },
                      { v: 'DAVIPLATA', l: 'Daviplata' },
                      { v: 'BANCOLOMBIA', l: 'Bancolombia' },
                      { v: 'TRANSFERENCIA', l: '🏦 Transf.' },
                    ].map((m) => (
                      <button
                        key={m.v}
                        onClick={() => setMetodoPago(m.v)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition ${
                          metodoPago === m.v
                            ? 'bg-[var(--brand)] text-white'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Domicilio */}
                <div className="card p-3 !rounded-2xl bg-[var(--bg-subtle)] !border-[var(--border)]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esDomicilio}
                      onChange={(e) => setEsDomicilio(e.target.checked)}
                      className="w-5 h-5 accent-[var(--brand)]"
                    />
                    <span className="font-semibold">🛵 Pedido a domicilio</span>
                  </label>

                  <AnimatePresence>
                    {esDomicilio && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 mt-3 overflow-hidden"
                      >
                        <input
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="📍 Dirección de entrega"
                          className="input text-sm"
                        />
                        <input
                          type="number"
                          value={valorDomicilio}
                          onChange={(e) => setValorDomicilio(e.target.value)}
                          placeholder="💰 Valor del domicilio"
                          className="input text-sm"
                        />
                        <select
                          value={domiciliarioId}
                          onChange={(e) => setDomiciliarioId(e.target.value)}
                          className="input text-sm"
                        >
                          <option value="">— Cualquier domi disponible —</option>
                          {domiciliarios.map((d) => (
                            <option key={d.id} value={d.id}>
                              🛵 {d.nombre}
                              {d.telefono ? ` · ${d.telefono}` : ''}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCobro(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={cobrar}
                  disabled={procesando}
                  className="btn btn-primary flex-1 !py-3"
                >
                  {procesando ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando…
                    </span>
                  ) : (
                    `Confirmar`
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
