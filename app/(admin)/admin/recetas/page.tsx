import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecetasModule from '@/components/admin/RecetasModule'

export const dynamic = 'force-dynamic'

export default async function RecetasPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  const [{ data: productos }, { data: insumos }, { data: recetas }] = await Promise.all([
    supabase.from('productos').select('id, codigo, nombre').eq('activo', true).order('nombre'),
    supabase.from('insumos').select('id, codigo, nombre, unidad, costo_promedio').eq('activo', true).order('nombre'),
    supabase
      .from('recetas')
      .select('id, producto_id, insumo_id, cantidad, merma_porcentaje, insumo:insumos(codigo, nombre, unidad, costo_promedio), producto:productos(nombre)'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Escandallos (Recetas)</h1>
        <p className="text-slate-500">
          Define los insumos que consume cada producto. Al confirmar una venta el sistema descuenta automáticamente del inventario.
        </p>
      </div>
      <RecetasModule
        productos={productos ?? []}
        insumos={insumos ?? []}
        recetasIniciales={(recetas ?? []) as any}
      />
    </div>
  )
}
