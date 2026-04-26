'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

type Caja = { id: string; nombre: string }
type Fila = {
  fecha: string
  caja_id: string
  caja_nombre: string
  metodo_pago: string
  num_ventas: number
  total_subtotal: number
  total_iva: number
  total: number
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'año' | 'custom'

export default function ReportesModule({ cajas }: { cajas: Caja[] }) {
  const supabase = createBrowserSupabase()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cajaFiltro, setCajaFiltro] = useState<string>('')
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(false)

  const calcularRango = (p: Periodo): [string, string] => {
    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    if (p === 'hoy') return [fmt(hoy), fmt(new Date(hoy.getTime() + 86400000))]
    if (p === 'semana') {
      const inicio = new Date(hoy)
      inicio.setDate(hoy.getDate() - hoy.getDay())
      return [fmt(inicio), fmt(new Date(hoy.getTime() + 86400000))]
    }
    if (p === 'mes') {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      return [fmt(inicio), fmt(new Date(hoy.getTime() + 86400000))]
    }
    if (p === 'año') {
      const inicio = new Date(ahora.getFullYear(), 0, 1)
      return [fmt(inicio), fmt(new Date(hoy.getTime() + 86400000))]
    }
    return [desde, hasta]
  }

  const generar = async () => {
    setCargando(true)
    const [d1, d2] = calcularRango(periodo)
    if (!d1 || !d2) {
      setCargando(false)
      return alert('Selecciona un rango válido')
    }
    const { data, error } = await supabase.rpc('reporte_ventas_periodo', {
      fecha_inicio: d1,
      fecha_fin: d2,
      p_caja_id: cajaFiltro || null,
    })
    setCargando(false)
    if (error) return alert('Error: ' + error.message)
    setFilas((data as Fila[]) ?? [])
  }

  const totales = filas.reduce(
    (acc, f) => {
      acc.subtotal += Number(f.total_subtotal)
      acc.iva += Number(f.total_iva)
      acc.total += Number(f.total)
      acc.num += Number(f.num_ventas)
      return acc
    },
    { subtotal: 0, iva: 0, total: 0, num: 0 }
  )

  const porMetodo = filas.reduce<Record<string, number>>((acc, f) => {
    acc[f.metodo_pago] = (acc[f.metodo_pago] ?? 0) + Number(f.total)
    return acc
  }, {})

  const porFecha = filas.reduce<Record<string, number>>((acc, f) => {
    acc[f.fecha] = (acc[f.fecha] ?? 0) + Number(f.total)
    return acc
  }, {})

  const exportarCSV = () => {
    const header = ['Fecha', 'Caja', 'Método pago', '# Ventas', 'Subtotal', 'IVA', 'Total']
    const rows = filas.map((f) => [
      f.fecha,
      f.caja_nombre,
      f.metodo_pago,
      f.num_ventas,
      f.total_subtotal,
      f.total_iva,
      f.total,
    ])
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const maxFecha = Math.max(...Object.values(porFecha), 1)

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="año">Este año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {periodo === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Caja</label>
            <select
              value={cajaFiltro}
              onChange={(e) => setCajaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Todas</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={generar}
              disabled={cargando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg flex-1"
            >
              {cargando ? 'Cargando…' : 'Generar'}
            </button>
            {filas.length > 0 && (
              <button
                onClick={exportarCSV}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-2 rounded-lg"
                title="Exportar CSV"
              >
                ⬇
              </button>
            )}
          </div>
        </div>
      </div>

      {filas.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase">Ventas totales</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtCOP(totales.total)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase"># de transacciones</p>
              <p className="text-2xl font-bold text-slate-800">{totales.num}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase">Ticket promedio</p>
              <p className="text-2xl font-bold text-slate-800">
                {fmtCOP(totales.num > 0 ? totales.total / totales.num : 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase">IVA generado</p>
              <p className="text-2xl font-bold text-slate-800">{fmtCOP(totales.iva)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Ventas por método de pago</h3>
              <ul className="space-y-2">
                {Object.entries(porMetodo)
                  .sort(([, a], [, b]) => b - a)
                  .map(([m, t]) => (
                    <li key={m}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{m}</span>
                        <span className="tabular-nums text-slate-600">{fmtCOP(t)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded">
                        <div
                          className="h-full bg-emerald-500 rounded"
                          style={{ width: `${(t / totales.total) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Ventas por fecha</h3>
              <div className="flex items-end gap-1 h-40">
                {Object.entries(porFecha)
                  .sort()
                  .map(([f, t]) => (
                    <div key={f} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-emerald-500 rounded-t"
                        style={{ height: `${(t / maxFecha) * 100}%` }}
                        title={`${f}: ${fmtCOP(t)}`}
                      />
                      <span className="text-[10px] text-slate-400 -rotate-45 origin-top-left whitespace-nowrap mt-2">
                        {f.slice(5)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3">Caja</th>
                  <th className="py-2 px-3">Método</th>
                  <th className="py-2 px-3 text-right"># Ventas</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                  <th className="py-2 px-3 text-right">IVA</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-sm">{f.fecha}</td>
                    <td className="py-2 px-3 text-sm">{f.caja_nombre}</td>
                    <td className="py-2 px-3 text-sm">{f.metodo_pago}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{f.num_ventas}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {fmtCOP(Number(f.total_subtotal))}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {fmtCOP(Number(f.total_iva))}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">
                      {fmtCOP(Number(f.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
