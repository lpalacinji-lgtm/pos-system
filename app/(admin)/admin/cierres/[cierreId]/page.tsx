import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DetalleCierre from '@/components/admin/DetalleCierre'

export const dynamic = 'force-dynamic'

export default async function DetalleCierrePage({
  params,
}: {
  params: Promise<{ cierreId: string }>
}) {
  const { cierreId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, caja_id').eq('id', user.id).single()
  if (!profile || !['ADMIN', 'CAJERA'].includes(profile.rol)) redirect('/')

  const { data: cierre } = await supabase
    .from('cierres_caja')
    .select(
      `*,
       caja:cajas(nombre, ubicacion),
       cerrado_por_profile:profiles!cierres_caja_cerrado_por_fkey(nombre)`
    )
    .eq('id', cierreId)
    .single()

  if (!cierre) notFound()

  // Cajera solo puede ver cierres de su caja
  if (profile.rol === 'CAJERA' && cierre.caja_id !== profile.caja_id) {
    redirect('/')
  }

  return <DetalleCierre cierre={cierre as any} />
}
