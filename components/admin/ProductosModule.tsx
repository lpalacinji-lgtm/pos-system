'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Producto = {
  id: string
  codigo: string
  nombre: string
  precio: number
  iva_porcentaje: number
  categoria_id: string | null
  tiempo_preparacion_min: number | null
  requiere_cocina: boolean
  activo: boolean
  categoria?: { nombre: string } | null
}
type Categoria = { id: string; nombre: string; orden: number }

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function ProductosModule({
  productosIniciales,
  categoriasIniciales,
}: {
  productosIniciales: Producto[]
  categoriasIniciales: Categoria[]
}) {
  const supabase = createBrowserSupabase()
  const [productos, setProductos] = useState(productosIniciales)
  const [categorias, setCategorias] = useState(categoriasIniciales)
  const [tab, setTab] = useState<'productos' | 'categorias'>('productos')
  const [edit, setEdit] = useState<Partial<Producto> | null>(null)
  const [editCat, setEditCat] = useState<Partial<Categoria> | null>(null)

  const recargar = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('productos').select('*, categoria:categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('*').order('nombre'),
    ])
    if (p) setProductos(p as any)
    if (c) setCategorias(c as any)
  }

  const guardarProducto = async () => {
    if (!edit?.codigo || !edit?.nombre || edit.precio == null) {
      return alert('Código, nombre y precio son obligatorios')
    }
    const payload = {
      codigo: edit.codigo,
      nombre: edit.nombre,
      precio: edit.precio,
      iva_porcentaje: edit.iva_porcentaje ?? 19,
      categoria_id: edit.categoria_id || null,
      tiempo_preparacion_min: edit.tiempo_preparacion_min ?? null,
      requiere_cocina: edit.requiere_cocina ?? true,
      activo: edit.activo ?? true,
    }
    const { error } = edit.id
      ? await supabase.from('productos').update(payload).eq('id', edit.id)
      : await supabase.from('productos').insert(payload)
    if (error) return alert('Error: ' + error.message)
    setEdit(null)
    recargar()
  }

  const guardarCategoria = async () => {
    if (!editCat?.nombre) return alert('Nombre obligatorio')
    const payload = { nombre: editCat.nombre, orden: editCat.orden ?? 0 }
    const { error } = editCat.id
      ? await supabase.from('categorias').update(payload).eq('id', editCat.id)
      : await supabase.from('categorias').insert(payload)
    if (error) return alert('Error: ' + error.message)
    setEditCat(null)
    recargar()
  }

  const toggleActivo = async (p: Producto) => {
    await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    recargar()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200 flex">
        <button
          onClick={() => setTab('productos')}
          className={`px-6 py-3 font-medium ${
            tab === 'productos' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'
          }`}
        >
          Productos ({productos.length})
        </button>
        <button
          onClick={() => setTab('categorias')}
          className={`px-6 py-3 font-medium ${
            tab === 'categorias' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'
          }`}
        >
          Categorías ({categorias.length})
        </button>
      </div>

      <div className="p-6">
        {tab === 'productos' && (
          <>
            <button
              onClick={() => setEdit({ iva_porcentaje: 19, requiere_cocina: true, activo: true })}
              className="mb-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg"
            >
              + Nuevo producto
            </button>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Nombre</th>
                    <th className="py-2 px-3">Categoría</th>
                    <th className="py-2 px-3 text-right">Precio</th>
                    <th className="py-2 px-3 text-right">IVA</th>
                    <th className="py-2 px-3">Cocina</th>
                    <th className="py-2 px-3">Activo</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-xs">{p.codigo}</td>
                      <td className="py-2 px-3 font-medium">{p.nombre}</td>
                      <td className="py-2 px-3 text-sm text-slate-600">{p.categoria?.nombre ?? '—'}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{fmtCOP(p.precio)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{p.iva_porcentaje}%</td>
                      <td className="py-2 px-3">
                        {p.requiere_cocina ? '🔥' : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => toggleActivo(p)} className="text-xs">
                          {p.activo ? '✅' : '⛔'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setEdit(p)}
                          className="text-emerald-600 hover:text-emerald-800 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'categorias' && (
          <>
            <button
              onClick={() => setEditCat({ orden: 0 })}
              className="mb-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg"
            >
              + Nueva categoría
            </button>
            <ul className="divide-y divide-slate-200">
              {categorias.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-slate-500">orden: {c.orden}</p>
                  </div>
                  <button
                    onClick={() => setEditCat(c)}
                    className="text-emerald-600 hover:text-emerald-800 text-sm"
                  >
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Modal producto */}
      {edit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">{edit.id ? 'Editar' : 'Nuevo'} producto</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Código *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.codigo ?? ''}
                  onChange={(e) => setEdit({ ...edit, codigo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nombre *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.nombre ?? ''}
                  onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Precio (COP) *</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.precio ?? ''}
                  onChange={(e) => setEdit({ ...edit, precio: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">IVA %</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.iva_porcentaje ?? 19}
                  onChange={(e) => setEdit({ ...edit, iva_porcentaje: Number(e.target.value) })}
                >
                  <option value={0}>0% (excluido)</option>
                  <option value={5}>5%</option>
                  <option value={8}>8% (carbohidratos)</option>
                  <option value={19}>19% (general)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Categoría</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.categoria_id ?? ''}
                  onChange={(e) => setEdit({ ...edit, categoria_id: e.target.value || null })}
                >
                  <option value="">— Sin categoría —</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tiempo prep. (min)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={edit.tiempo_preparacion_min ?? ''}
                  onChange={(e) =>
                    setEdit({ ...edit, tiempo_preparacion_min: Number(e.target.value) || null })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edit.requiere_cocina ?? true}
                onChange={(e) => setEdit({ ...edit, requiere_cocina: e.target.checked })}
              />
              <span className="text-sm">Requiere preparación en cocina</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edit.activo ?? true}
                onChange={(e) => setEdit({ ...edit, activo: e.target.checked })}
              />
              <span className="text-sm">Activo en POS</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEdit(null)} className="flex-1 bg-slate-200 py-2 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoría */}
      {editCat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">{editCat.id ? 'Editar' : 'Nueva'} categoría</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Nombre *</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                value={editCat.nombre ?? ''}
                onChange={(e) => setEditCat({ ...editCat, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Orden de aparición</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={editCat.orden ?? 0}
                onChange={(e) => setEditCat({ ...editCat, orden: Number(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditCat(null)} className="flex-1 bg-slate-200 py-2 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={guardarCategoria}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
