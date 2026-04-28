import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeaderDomi from '@/components/domicilio/HeaderDomi'
import PerfilDomi from '@/components/domicilio/PerfilDomi'

export const dynamic = 'force-dynamic'

export default async function PerfilDomiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre, email, telefono, created_at')
    .eq('id', user.id)
    .single()
  if (!profile || profile.rol !== 'DOMICILIARIO') redirect('/')

  // Stats acumuladas
  const { data: entregasTotal } = await supabase
    .from('ventas')
    .select('id', { count: 'exact', head: true })
    .eq('domiciliario_id', user.id)
    .eq('estado', 'ENTREGADO')

  return (
    <>
      <HeaderDomi nombre={profile.nombre} />
      <PerfilDomi
        nombre={profile.nombre}
        email={profile.email}
        telefono={profile.telefono}
        memberSince={profile.created_at}
        totalEntregas={(entregasTotal as any)?.count ?? 0}
      />
    </>
  )
}
