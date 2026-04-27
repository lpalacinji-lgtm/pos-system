import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CierresModule from '@/components/admin/CierresModule'

export const dynamic = 'force-dynamic'

export default async function CierresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  const [{ data: cajas }, { data: cierres }] = await Promise.all([
    supabase
      .from('cajas')
      .select(
        `id, nombre, ubicacion, cerrada_en,
         cerrada_por_profile:profiles!cajas_cerrada_por_fkey(nombre)`
      )
      .order('nombre'),
    supabase
      .from('cierres_caja')
      .select(
        `id, caja_id, desde, hasta, total_ventas, cantidad_ventas,
         created_at,
         cerrado_por_profile:profiles!cierres_caja_cerrado_por_fkey(nombre),
         caja:cajas(nombre)`
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Cierres de caja</h1>
      <CierresModule
        cajas={(cajas ?? []) as any}
        cierresHistoricos={(cierres ?? []) as any}
      />
    </div>
  )
}
