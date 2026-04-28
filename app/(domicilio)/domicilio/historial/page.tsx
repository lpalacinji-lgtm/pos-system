import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HeaderDomi from '@/components/domicilio/HeaderDomi'
import HistorialDomi from '@/components/domicilio/HistorialDomi'

export const dynamic = 'force-dynamic'

export default async function HistorialDomiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre').eq('id', user.id).single()
  if (!profile || profile.rol !== 'DOMICILIARIO') redirect('/')

  return (
    <>
      <HeaderDomi nombre={profile.nombre} />
      <HistorialDomi />
    </>
  )
}
