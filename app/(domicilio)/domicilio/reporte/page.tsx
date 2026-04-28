import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReporteImprimible from '@/components/domicilio/ReporteImprimible'

export const dynamic = 'force-dynamic'

export default async function ReporteDomiPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre').eq('id', user.id).single()
  if (!profile || profile.rol !== 'DOMICILIARIO') redirect('/')

  return (
    <ReporteImprimible
      nombre={profile.nombre}
      tipo={sp.tipo ?? 'hoy'}
      desdeCustom={sp.desde}
      hastaCustom={sp.hasta}
    />
  )
}
