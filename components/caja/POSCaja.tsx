'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from '@/components/LogoutButton'
import BannerListos from '@/components/caja/BannerListos'
import ClienteFormFields, { ClienteData } from '@/components/caja/ClienteFormFields'

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
      alert('No encontrado. Llena los datos manualmente.')
      setClienteEncontrado(false)
    }
  }

  const cobrar = async () => {
    if (carrito.length === 0) return alert('Carrito vacío')
    if (esDomicilio && !direccion.trim())
      return alert('Falta dirección de entrega')

    // Validaciones específicas para electrónica
    if (tipoFactura === 'ELECTRONICA') {
      if (!cliente.nit?.trim() || !cliente.nombre?.trim() || !cliente.email?.trim()) {
        return alert('Factura electrónica requiere documento, nombre y email')
      }
    }

    setProcesando(true)
    try {
      let clienteId: string | null = cliente.id ?? null

      // Crear/actualizar cliente si tiene datos
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

      if (cliente.telefono) {
        if (confirm(`Venta creada. ¿Enviar factura por WhatsApp?`)) {
          await fetch('/api/facturacion/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venta_id: ventaId, telefono: cliente.telefono }),
          })
        }
      }

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold">{caja.nombre}</h1>
          <p className="text-xs opacity-80">
            {profile.nombre} · {caja.ubicacion}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/caja/${caja.id}/cuadre`}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            📊 Cuadre
          </Link>
          <Link
            href={`/caja/${caja.id}/historial`}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            📜 Historial
          </Link>
          <LogoutButton className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5" />
        </div>
      </header>

      {/* Banner pedidos listos */}
      <BannerListos cajaId={caja.id} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Productos */}
        <main className="p-4 overflow-y-auto">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Buscar producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${
                !categoriaActiva
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border'
              }`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoriaActiva(c.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${
                  categoriaActiva === c.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                  className="bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-emerald-500 hover:shadow-md transition disabled:opacity-50"
              >
                <p className="text-xs text-gray-500 font-mono">{p.codigo}</p>
                <p className="font-medium text-gray-800 line-clamp-2">{p.nombre}</p>
                <p className="text-emerald-600 font-bold mt-1">{fmt(p.precio)}</p>
                {p.iva_porcentaje > 0 && (
                  <p className="text-xs text-gray-400">+ IVA {p.iva_porcentaje}%</p>
                )}
              </button>
            ))}
          </div>
        </main>

        {/* Carrito */}
        <aside className="bg-white border-l border-gray-200 flex flex-col max-h-screen">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">🛒 Pedido ({carrito.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {carrito.length === 0 && (
              <p className="text-gray-400 text-center py-8 text-sm">
                Toca un producto para agregarlo
              </p>
            )}
            {carrito.map((it) => (
              <div
                key={it.producto.id}
                className="bg-gray-50 rounded-lg p-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{it.producto.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {fmt(it.producto.precio)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cambiarCantidad(it.producto.id, -1)}
                    className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-bold">{it.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(it.producto.id, 1)}
                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => quitar(it.producto.id)}
                  className="text-red-500 hover:text-red-700 text-lg"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="border-t p-4 space-y-2 bg-white">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="tabular-nums">{fmt(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA:</span>
              <span className="tabular-nums">{fmt(totales.iva)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-1 border-t">
              <span>Total:</span>
              <span className="text-emerald-600 tabular-nums">{fmt(totales.total)}</span>
            </div>
            <button
              onClick={() => setShowCobro(true)}
              disabled={carrito.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg mt-2"
            >
              💳 Cobrar
            </button>
          </div>
        </aside>
      </div>

      {/* Modal cobro */}
      {showCobro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Procesar venta — {fmt(totales.total)}
            </h3>

            <div className="space-y-3">
              {/* Tipo factura PRIMERO para que el form se adapte */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Tipo de factura
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTipoFactura('POS')}
                    className={`py-2 rounded-lg border ${
                      tipoFactura === 'POS'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : ''
                    }`}
                  >
                    POS
                  </button>
                  <button
                    onClick={() => setTipoFactura('ELECTRONICA')}
                    className={`py-2 rounded-lg border ${
                      tipoFactura === 'ELECTRONICA'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : ''
                    }`}
                  >
                    Electrónica
                  </button>
                </div>
              </div>

              {/* Buscar cliente por NIT */}
              <div className="grid grid-cols-3 gap-2">
                <label className="text-sm font-medium col-span-3">
                  Buscar cliente
                </label>
                <input
                  value={cliente.nit}
                  onChange={(e) => setCliente({ ...cliente, nit: e.target.value })}
                  placeholder="Cédula / NIT"
                  className="col-span-2 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={buscarCliente}
                  className="bg-blue-600 text-white rounded-lg"
                >
                  Buscar
                </button>
              </div>

              {clienteEncontrado && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
                  ✓ Cliente encontrado: <strong>{cliente.nombre}</strong>
                </div>
              )}

              {/* Form cliente según tipo factura */}
              <ClienteFormFields
                tipoFactura={tipoFactura}
                cliente={cliente}
                onChange={setCliente}
              />

              {/* Método pago */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Método de pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'TRANSFERENCIA'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodoPago(m)}
                      className={`py-2 px-2 rounded-lg border text-xs ${
                        metodoPago === m
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : ''
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domicilio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={esDomicilio}
                    onChange={(e) => setEsDomicilio(e.target.checked)}
                  />
                  🛵 Pedido a domicilio
                </label>

                {esDomicilio && (
                  <div className="space-y-2 mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div>
                      <label className="text-xs text-gray-700 font-medium">
                        Dirección de entrega *
                      </label>
                      <input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Cra 50 #80-45 apto 302"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700 font-medium">
                        Valor del domicilio (COP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={valorDomicilio}
                        onChange={(e) => setValorDomicilio(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700 font-medium">
                        Asignar domiciliario (opcional)
                      </label>
                      <select
                        value={domiciliarioId}
                        onChange={(e) => setDomiciliarioId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 bg-white"
                      >
                        <option value="">— Cualquier domi disponible —</option>
                        {domiciliarios.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                            {d.telefono ? ` · ${d.telefono}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowCobro(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={cobrar}
                disabled={procesando}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
              >
                {procesando ? 'Procesando...' : `Confirmar ${fmt(totales.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
