'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from '@/components/LogoutButton'

type Producto = {
  id: string; codigo: string; nombre: string; precio: number;
  iva_porcentaje: number; categoria_id: string | null;
  categoria?: { nombre: string } | null;
}
type Categoria = { id: string; nombre: string }
type ItemCarrito = { producto: Producto; cantidad: number; observacion?: string }

export default function POSCaja({ caja, productos, categorias, profile }: {
  caja: any; productos: Producto[]; categorias: Categoria[]; profile: any
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cliente, setCliente] = useState<any>(null)
  const [docCliente, setDocCliente] = useState('')
  const [esDomicilio, setEsDomicilio] = useState(false)
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO')
  const [tipoFactura, setTipoFactura] = useState<'POS' | 'ELECTRONICA'>('POS')
  const [procesando, setProcesando] = useState(false)
  const [showCobro, setShowCobro] = useState(false)

  const productosFiltrados = useMemo(() => {
    let list = productos
    if (categoriaActiva) list = list.filter(p => p.categoria_id === categoriaActiva)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
    }
    return list
  }, [productos, categoriaActiva, busqueda])

  const totales = useMemo(() => {
    let subtotal = 0, iva = 0
    carrito.forEach(it => {
      const lineSub = it.producto.precio * it.cantidad
      subtotal += lineSub
      iva += lineSub * Number(it.producto.iva_porcentaje) / 100
    })
    return { subtotal, iva, total: subtotal + iva }
  }, [carrito])

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n)

  function agregarProducto(p: Producto) {
    setCarrito(prev => {
      const existing = prev.find(i => i.producto.id === p.id)
      if (existing) {
        return prev.map(i => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito(prev => prev.flatMap(i => {
      if (i.producto.id !== id) return [i]
      const nueva = i.cantidad + delta
      return nueva > 0 ? [{ ...i, cantidad: nueva }] : []
    }))
  }

  function quitarItem(id: string) {
    setCarrito(prev => prev.filter(i => i.producto.id !== id))
  }

  async function buscarCliente() {
    if (!docCliente.trim()) return
    const res = await fetch(`/api/nit/${docCliente.trim()}`)
    const data = await res.json()
    if (data.cliente) setCliente(data.cliente)
    else alert('Cliente no encontrado. Llena los datos manualmente.')
  }

  async function cobrar() {
    if (carrito.length === 0) return alert('Carrito vacío')
    if (esDomicilio && !direccion.trim()) return alert('Falta dirección de entrega')

    setProcesando(true)
    try {
      // Si hay cliente nuevo (de API externa), guardarlo primero
      let clienteId = cliente?.id ?? null
      if (cliente && !cliente.id && cliente.documento) {
        const { data: nuevoCli, error } = await supabase
          .from('clientes')
          .upsert(cliente, { onConflict: 'documento' })
          .select('id').single()
        if (error) throw error
        clienteId = nuevoCli.id
      }

      const items = carrito.map(it => ({
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
      })

      if (error) throw error

      // Abrir recibo imprimible en nueva pestaña
      const reciboUrl = `/recibo/${ventaId}`
      window.open(reciboUrl, '_blank', 'width=400,height=700')

      // Si tiene email/whatsapp, ofrecer envío
      if (cliente?.telefono) {
        if (confirm(`Venta #${ventaId} creada. ¿Enviar factura por WhatsApp?`)) {
          await fetch('/api/facturacion/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venta_id: ventaId, telefono: cliente.telefono }),
          })
        }
      }

      // Reset
      setCarrito([])
      setCliente(null)
      setDocCliente('')
      setEsDomicilio(false)
      setDireccion('')
      setShowCobro(false)
      router.refresh()
    } catch (err: any) {
      alert('❌ Error: ' + err.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-emerald-700 text-white px-4 py-3 flex justify-between items-center shadow">
        <div>
          <h1 className="text-lg font-bold">{caja.nombre}</h1>
          <p className="text-xs opacity-80">{profile.nombre}</p>
        </div>
        <LogoutButton className="text-white/80 hover:text-white" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Productos */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex gap-2 mb-3">
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto o código..."
              className="flex-1 px-4 py-3 border rounded-lg"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            <button onClick={() => setCategoriaActiva(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${!categoriaActiva ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>
              Todas
            </button>
            {categorias.map(c => (
              <button key={c.id} onClick={() => setCategoriaActiva(c.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${categoriaActiva === c.id ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>
                {c.nombre}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productosFiltrados.map(p => (
                <button key={p.id} onClick={() => agregarProducto(p)}
                  className="bg-white border rounded-lg p-3 text-left hover:shadow-md hover:border-emerald-500 transition active:scale-95">
                  <p className="font-semibold text-sm leading-tight">{p.nombre}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.codigo}</p>
                  <p className="text-emerald-700 font-bold mt-2">{fmt(Number(p.precio))}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="w-full lg:w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">🛒 Pedido ({carrito.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {carrito.length === 0 && (
              <p className="text-center text-gray-400 mt-12">Selecciona productos</p>
            )}
            {carrito.map(it => (
              <div key={it.producto.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{it.producto.nombre}</p>
                    <p className="text-xs text-gray-500">{fmt(Number(it.producto.precio))} c/u</p>
                  </div>
                  <button onClick={() => quitarItem(it.producto.id)} className="text-red-500 text-sm">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(it.producto.id, -1)}
                    className="w-7 h-7 bg-gray-200 rounded">−</button>
                  <span className="w-8 text-center font-medium">{it.cantidad}</span>
                  <button onClick={() => cambiarCantidad(it.producto.id, +1)}
                    className="w-7 h-7 bg-gray-200 rounded">+</button>
                  <span className="ml-auto font-bold">
                    {fmt(Number(it.producto.precio) * it.cantidad)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-4 space-y-2 bg-gray-50">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><span>{fmt(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA</span><span>{fmt(totales.iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span><span className="text-emerald-700">{fmt(totales.total)}</span>
            </div>
            <button onClick={() => setShowCobro(true)} disabled={carrito.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg mt-2">
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal cobro */}
      {showCobro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Procesar venta — {fmt(totales.total)}</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="text-sm font-medium col-span-3">Cliente (NIT/CC)</label>
                <input value={docCliente} onChange={e => setDocCliente(e.target.value)}
                  placeholder="Documento" className="col-span-2 border rounded-lg px-3 py-2" />
                <button onClick={buscarCliente} className="bg-blue-600 text-white rounded-lg">Buscar</button>
              </div>

              {cliente && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-medium">{cliente.razon_social}</p>
                  <p className="text-xs text-gray-600">{cliente.email} · {cliente.telefono}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-1">Tipo de factura</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTipoFactura('POS')}
                    className={`py-2 rounded-lg border ${tipoFactura === 'POS' ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>
                    POS
                  </button>
                  <button onClick={() => setTipoFactura('ELECTRONICA')}
                    className={`py-2 rounded-lg border ${tipoFactura === 'ELECTRONICA' ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>
                    Electrónica
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'TRANSFERENCIA'].map(m => (
                    <button key={m} onClick={() => setMetodoPago(m)}
                      className={`py-2 px-2 rounded-lg border text-xs ${metodoPago === m ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={esDomicilio} onChange={e => setEsDomicilio(e.target.checked)} />
                  Pedido a domicilio
                </label>
                {esDomicilio && (
                  <input value={direccion} onChange={e => setDireccion(e.target.value)}
                    placeholder="Dirección de entrega" className="w-full border rounded-lg px-3 py-2 mt-2" />
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowCobro(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={cobrar} disabled={procesando}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium">
                {procesando ? 'Procesando...' : `Confirmar ${fmt(totales.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
