import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import POSCaja from '@/components/caja/POSCaja'

export const dynamic = 'force-dynamic'

export default async function CajaPage({
  params,
}: {
  params: Promise<{ cajaId: string }>
}) {
  const { cajaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['CAJERA', 'ADMIN'].includes(profile.rol)) redirect('/')

  const [
    { data: caja },
    { data: productos },
    { data: categorias },
    { data: domiciliarios },
  ] = await Promise.all([
    supabase.from('cajas').select('*').eq('id', cajaId).single(),
    supabase
      .from('productos')
      .select('*, categoria:categorias(nombre)')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('categorias').select('*').order('orden'),
    supabase
      .from('profiles')
      .select('id, nombre, telefono')
      .eq('rol', 'DOMICILIARIO')
      .eq('activo', true)
      .order('nombre'),
  ])

  if (!caja) redirect('/')

  return (
    <POSCaja
      caja={caja}
      productos={productos || []}
      categorias={categorias || []}
      domiciliarios={domiciliarios || []}
      profile={profile}
    />
  )
}
