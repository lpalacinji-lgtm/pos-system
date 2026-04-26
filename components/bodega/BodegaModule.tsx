'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

type Insumo = {
  id: string
  codigo: string
  nombre: string
  unidad: 'kg' | 'gr' | 'lt' | 'ml' | 'unidad'
  stock_actual: number
  stock_minimo: number
  costo_promedio: number
  proveedor: string | null
  activo: boolean
}

type Tab = 'stock' | 'movimiento' | 'kardex' | 'csv'

export default function BodegaModule({
  insumosIniciales,
}: {
  insumosIniciales: Insumo[]
}) {
  const supabase = createBrowserSupabase()
  const [tab, setTab] = useState<Tab>('stock')
  const [insumos, setInsumos] = useState<Insumo[]>(insumosIniciales)
  const [busqueda, setBusqueda] = useState('')

  // Movimiento manual
  const [movInsumo, setMovInsumo] = useState('')
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA'>('ENTRADA')
  const [movCantidad, setMovCantidad] = useState('')
  const [movCosto, setMovCosto] = useState('')
  const [movMotivo, setMovMotivo] = useState('')
  const [movGuardando, setMovGuardando] = useState(false)

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvResultado, setCsvResultado] = useState<{
    creados: number
    actualizados: number
    errores: string[]
  } | null>(null)
  const [csvCargando, setCsvCargando] = useState(false)

  // Kardex
  const [kardexInsumo, setKardexInsumo] = useState('')
  const [kardexMovs, setKardexMovs] = useState<any[]>([])

  const insumosFiltrados = insumos.filter(
    (i) =>
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.codigo.toLowerCase().includes(busqueda.toLowerCase())
  )

  const recargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('nombre', { ascending: true })
    if (data) setInsumos(data as Insumo[])
  }

  const guardarMovimiento = async () => {
    if (!movInsumo || !movCantidad) return alert('Completa los campos requeridos')
    const cantidadNum = parseFloat(movCantidad)
    if (cantidadNum <= 0) return alert('La cantidad debe ser mayor a 0')

    setMovGuardando(true)
    const insumo = insumos.find((i) => i.id === movInsumo)!
    let nuevoStock = insumo.stock_actual
    let cantidadFirmada = cantidadNum

    if (movTipo === 'ENTRADA') {
      nuevoStock += cantidadNum
    } else if (movTipo === 'SALIDA' || movTipo === 'MERMA') {
      if (cantidadNum > insumo.stock_actual) {
        setMovGuardando(false)
        return alert(`Stock insuficiente. Disponible: ${insumo.stock_actual} ${insumo.unidad}`)
      }
      nuevoStock -= cantidadNum
      cantidadFirmada = -cantidadNum
    } else if (movTipo === 'AJUSTE') {
      // En ajuste, cantidad es el nuevo stock absoluto
      cantidadFirmada = cantidadNum - insumo.stock_actual
      nuevoStock = cantidadNum
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error: errMov } = await supabase.from('movimientos_bodega').insert({
      insumo_id: movInsumo,
      tipo: movTipo,
      cantidad: cantidadFirmada,
      costo_unitario: movCosto ? parseFloat(movCosto) : null,
      stock_resultante: nuevoStock,
      motivo: movMotivo || null,
      usuario_id: user?.id,
    })

    if (errMov) {
      setMovGuardando(false)
      return alert('Error: ' + errMov.message)
    }

    const { error: errIns } = await supabase
      .from('insumos')
      .update({
        stock_actual: nuevoStock,
        ...(movTipo === 'ENTRADA' && movCosto
          ? { costo_promedio: parseFloat(movCosto) }
          : {}),
      })
      .eq('id', movInsumo)

    setMovGuardando(false)
    if (errIns) return alert('Error actualizando stock: ' + errIns.message)

    alert('Movimiento registrado ✓')
    setMovCantidad('')
    setMovCosto('')
    setMovMotivo('')
    await recargarInsumos()
  }

  const subirCSV = async () => {
    if (!csvFile) return
    setCsvCargando(true)
    setCsvResultado(null)
    const fd = new FormData()
    fd.append('file', csvFile)
    try {
      const r = await fetch('/api/inventario/upload', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Error desconocido')
      setCsvResultado(j)
      await recargarInsumos()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setCsvCargando(false)
    }
  }

  const cargarKardex = async (insumoId: string) => {
    setKardexInsumo(insumoId)
    const { data } = await supabase
      .from('movimientos_bodega')
      .select('id, tipo, cantidad, stock_resultante, costo_unitario, motivo, created_at')
      .eq('insumo_id', insumoId)
      .order('created_at', { ascending: false })
      .limit(100)
    setKardexMovs(data ?? [])
  }

  const fmt = (n: number, unidad: string) =>
    `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(n)} ${unidad}`

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)

  const criticos = insumos.filter((i) => i.stock_actual <= i.stock_minimo)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase">Total insumos</p>
          <p className="text-3xl font-bold text-slate-800">{insumos.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase">En crítico</p>
          <p className="text-3xl font-bold text-red-500">{criticos.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase">Activos</p>
          <p className="text-3xl font-bold text-emerald-600">
            {insumos.filter((i) => i.activo).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase">Valor inventario</p>
          <p className="text-2xl font-bold text-slate-800">
            {fmtCOP(
              insumos.reduce(
                (acc, i) => acc + i.stock_actual * (i.costo_promedio ?? 0),
                0
              )
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="border-b border-slate-200 flex">
          {(['stock', 'movimiento', 'csv', 'kardex'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-medium ${
                tab === t
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'stock'
                ? 'Stock actual'
                : t === 'movimiento'
                ? 'Entrada / Salida'
                : t === 'csv'
                ? 'Carga masiva CSV'
                : 'Kardex'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'stock' && (
            <>
              <input
                type="text"
                placeholder="Buscar por código o nombre…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full md:w-96 mb-4 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Insumo</th>
                      <th className="py-2 px-3 text-right">Stock</th>
                      <th className="py-2 px-3 text-right">Mínimo</th>
                      <th className="py-2 px-3 text-right">Costo prom.</th>
                      <th className="py-2 px-3">Proveedor</th>
                      <th className="py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosFiltrados.map((i) => {
                      const critico = i.stock_actual <= i.stock_minimo
                      return (
                        <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-xs text-slate-600">
                            {i.codigo}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{i.nombre}</td>
                          <td
                            className={`py-2 px-3 text-right tabular-nums font-semibold ${
                              critico ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {fmt(i.stock_actual, i.unidad)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                            {fmt(i.stock_minimo, i.unidad)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            {fmtCOP(i.costo_promedio ?? 0)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-sm">
                            {i.proveedor ?? '—'}
                          </td>
                          <td className="py-2 px-3">
                            {!i.activo ? (
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                Inactivo
                              </span>
                            ) : critico ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                CRÍTICO
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'movimiento' && (
            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Insumo *
                </label>
                <select
                  value={movInsumo}
                  onChange={(e) => setMovInsumo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">— Selecciona —</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.codigo} · {i.nombre} (stock: {fmt(i.stock_actual, i.unidad)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ENTRADA">Entrada (compra)</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste de inventario</option>
                    <option value="MERMA">Merma / Pérdida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {movTipo === 'AJUSTE' ? 'Stock real medido *' : 'Cantidad *'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={movCantidad}
                    onChange={(e) => setMovCantidad(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              {movTipo === 'ENTRADA' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Costo unitario (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={movCosto}
                    onChange={(e) => setMovCosto(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Actualizará el costo promedio"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo / Observación
                </label>
                <textarea
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                onClick={guardarMovimiento}
                disabled={movGuardando}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg"
              >
                {movGuardando ? 'Guardando…' : 'Registrar movimiento'}
              </button>
            </div>
          )}

          {tab === 'csv' && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-semibold mb-2">📋 Formato esperado del CSV</p>
                <p className="mb-2">Columnas obligatorias: <code>codigo, nombre, unidad, cantidad</code></p>
                <p className="mb-2">Columnas opcionales: <code>costo, proveedor, stock_minimo</code></p>
                <p>Unidades válidas: <code>kg, gr, lt, ml, unidad</code></p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Ver ejemplo</summary>
                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
{`codigo,nombre,unidad,cantidad,costo,proveedor
HAR-001,Harina de trigo,kg,25,3500,Molinos del Valle
QUE-001,Queso mozzarella,kg,5,18000,Lácteos Andinos
TOM-001,Salsa de tomate,lt,10,8000,Distribuidora Sur`}
                  </pre>
                </details>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              <button
                onClick={subirCSV}
                disabled={!csvFile || csvCargando}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-semibold px-6 py-2 rounded-lg"
              >
                {csvCargando ? 'Procesando…' : 'Cargar CSV'}
              </button>
              {csvResultado && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="font-semibold text-emerald-800">
                    ✓ Cargado: {csvResultado.creados} creados · {csvResultado.actualizados} actualizados
                  </p>
                  {csvResultado.errores.length > 0 && (
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {csvResultado.errores.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'kardex' && (
            <div>
              <select
                value={kardexInsumo}
                onChange={(e) => cargarKardex(e.target.value)}
                className="w-full md:w-96 mb-4 px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">— Selecciona un insumo —</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.codigo} · {i.nombre}
                  </option>
                ))}
              </select>
              {kardexInsumo && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3 text-right">Cantidad</th>
                      <th className="py-2 px-3 text-right">Stock resultante</th>
                      <th className="py-2 px-3 text-right">Costo unit.</th>
                      <th className="py-2 px-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexMovs.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-xs text-slate-600">
                          {new Date(m.created_at).toLocaleString('es-CO')}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              m.tipo === 'ENTRADA'
                                ? 'bg-emerald-100 text-emerald-700'
                                : m.tipo === 'VENTA' || m.tipo === 'SALIDA'
                                ? 'bg-blue-100 text-blue-700'
                                : m.tipo === 'MERMA'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {m.tipo}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-semibold ${
                            m.cantidad >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {m.cantidad >= 0 ? '+' : ''}
                          {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(m.cantidad)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(m.stock_resultante)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                          {m.costo_unitario ? fmtCOP(m.costo_unitario) : '—'}
                        </td>
                        <td className="py-2 px-3 text-sm text-slate-600">{m.motivo ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
