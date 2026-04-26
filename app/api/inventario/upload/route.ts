import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

/**
 * Carga masiva de inventario desde CSV.
 *
 * Formato esperado del CSV:
 *   codigo,nombre,unidad,cantidad,costo,proveedor
 *   HAR-001,Harina trigo,kg,50,3500,Distribuidora XYZ
 *
 * Comportamiento:
 *  - Si el código ya existe → suma al stock_actual y registra ENTRADA en kardex
 *  - Si no existe → crea el insumo con stock inicial
 *  - Reporta errores por fila sin abortar el proceso completo
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (!profile || !['ADMIN', 'BODEGA'].includes(profile.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Falta archivo' }, { status: 400 })

  const text = await file.text()
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: 'CSV mal formado', detalles: parsed.errors }, { status: 400 })
  }

  // Validar columnas
  const requiredCols = ['codigo', 'nombre', 'unidad', 'cantidad']
  const firstRow = parsed.data[0] as any
  const missing = requiredCols.filter(c => !(c in (firstRow ?? {})))
  if (missing.length > 0) {
    return NextResponse.json({
      error: `Faltan columnas: ${missing.join(', ')}. Esperadas: ${requiredCols.join(', ')}, costo (opcional), proveedor (opcional)`
    }, { status: 400 })
  }

  // Validar y sanear filas
  const rows = (parsed.data as any[]).map((r, idx) => ({
    codigo: String(r.codigo || '').trim().toUpperCase(),
    nombre: String(r.nombre || '').trim(),
    unidad: String(r.unidad || '').trim().toLowerCase(),
    cantidad: parseFloat(r.cantidad),
    costo: r.costo ? parseFloat(r.costo) : null,
    proveedor: r.proveedor ? String(r.proveedor).trim() : null,
    _fila: idx + 2, // 1 = header
  })).filter(r => r.codigo && r.cantidad > 0)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV sin filas válidas' }, { status: 400 })
  }

  // Validar unidades
  const unidadesValidas = ['kg', 'gr', 'lt', 'ml', 'unidad']
  const filasInvalidas = rows.filter(r => !unidadesValidas.includes(r.unidad))
  if (filasInvalidas.length > 0) {
    return NextResponse.json({
      error: 'Unidades inválidas en algunas filas',
      filas: filasInvalidas.map(r => ({ fila: r._fila, codigo: r.codigo, unidad: r.unidad }))
    }, { status: 400 })
  }

  // Llamar RPC
  const { data, error } = await supabase.rpc('cargar_inventario_masivo', { p_data: rows })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    procesadas: rows.length,
    resultado: data,
  })
}
