'use client'

import { useMemo, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Producto = { id: string; codigo: string; nombre: string }
type Insumo = {
  id: string
  codigo: string
  nombre: string
  unidad: string
  costo_promedio: number
}
type Receta = {
  id: string
  producto_id: string
  insumo_id: string
  cantidad: number
  merma_porcentaje: number
  insumo: { codigo: string; nombre: string; unidad: string; costo_promedio: number }
  producto: { nombre: string }
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function RecetasModule({
  productos,
  insumos,
  recetasIniciales,
}: {
  productos: Producto[]
  insumos: Insumo[]
  recetasIniciales: Receta[]
}) {
  const supabase = createBrowserSupabase()
  const [recetas, setRecetas] = useState<Receta[]>(recetasIniciales)
  const [productoSel, setProductoSel] = useState(productos[0]?.id ?? '')
  const [nuevoInsumo, setNuevoInsumo] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState('')
  const [nuevaMerma, setNuevaMerma] = useState('0')

  const recetasProducto = useMemo(
    () => recetas.filter((r) => r.producto_id === productoSel),
    [recetas, productoSel]
  )

  const costoTotal = recetasProducto.reduce(
    (acc, r) =>
      acc +
      r.cantidad * (1 + (r.merma_porcentaje ?? 0) / 100) * (r.insumo.costo_promedio ?? 0),
    0
  )

  const recargar = async () => {
    const { data } = await supabase
      .from('recetas')
      .select(
        'id, producto_id, insumo_id, cantidad, merma_porcentaje, insumo:insumos(codigo, nombre, unidad, costo_promedio), producto:productos(nombre)'
      )
    setRecetas((data ?? []) as unknown as Receta[])
  }

  const agregar = async () => {
    if (!productoSel || !nuevoInsumo || !nuevaCantidad) return
    const cant = parseFloat(nuevaCantidad)
    if (cant <= 0) return alert('Cantidad debe ser > 0')
    const { error } = await supabase.from('recetas').insert({
      producto_id: productoSel,
      insumo_id: nuevoInsumo,
      cantidad: cant,
      merma_porcentaje: parseFloat(nuevaMerma) || 0,
    })
    if (error) return alert('Error: ' + error.message)
    setNuevoInsumo('')
    setNuevaCantidad('')
    setNuevaMerma('0')
    recargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este insumo de la receta?')) return
    await supabase.from('recetas').delete().eq('id', id)
    recargar()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Selector de productos */}
      <aside className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <h3 className="font-semibold text-slate-800 mb-2 px-2">Productos</h3>
        <ul className="space-y-1 max-h-[600px] overflow-y-auto">
          {productos.map((p) => {
            const cuenta = recetas.filter((r) => r.producto_id === p.id).length
            return (
              <li key={p.id}>
                <button
                  onClick={() => setProductoSel(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                    productoSel === p.id ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="font-mono text-xs text-slate-500">{p.codigo}</span>{' '}
                    <span className="font-medium">{p.nombre}</span>
                  </span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{cuenta}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Detalle receta */}
      <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        {productoSel ? (
          <>
            <div className="flex justify-between items-baseline border-b border-slate-200 pb-3">
              <h2 className="font-semibold text-slate-800">
                Receta de: {productos.find((p) => p.id === productoSel)?.nombre}
              </h2>
              <div className="text-right">
                <p className="text-xs text-slate-500">Costo de insumos por unidad</p>
                <p className="text-lg font-bold text-emerald-600">{fmtCOP(costoTotal)}</p>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2">Insumo</th>
                  <th className="py-2 text-right">Cantidad</th>
                  <th className="py-2 text-right">Merma %</th>
                  <th className="py-2 text-right">Costo</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recetasProducto.map((r) => {
                  const conMerma = r.cantidad * (1 + r.merma_porcentaje / 100)
                  const costo = conMerma * (r.insumo.costo_promedio ?? 0)
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2">
                        <span className="font-mono text-xs text-slate-500">{r.insumo.codigo}</span>{' '}
                        <span className="font-medium">{r.insumo.nombre}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {r.cantidad} {r.insumo.unidad}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-500">
                        {r.merma_porcentaje}%
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtCOP(costo)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => eliminar(r.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {recetasProducto.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-sm">
                      Aún no hay insumos. Agrega el primero abajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Agregar insumo */}
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs text-slate-500 mb-1">Insumo</label>
                <select
                  value={nuevoInsumo}
                  onChange={(e) => setNuevoInsumo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">— Selecciona —</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.codigo} · {i.nombre} ({i.unidad})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={nuevaCantidad}
                  onChange={(e) => setNuevaCantidad(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Merma %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={nuevaMerma}
                  onChange={(e) => setNuevaMerma(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="col-span-12 md:col-span-2">
                <button
                  onClick={agregar}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-2 rounded-lg"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-slate-400 py-12">Selecciona un producto a la izquierda</p>
        )}
      </section>
    </div>
  )
}
