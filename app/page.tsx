import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, caja_id').eq('id', user.id).single()

  if (!profile) redirect('/login')

  const ROLE_HOME: Record<string, string> = {
    ADMIN: '/admin',
    CAJERA: profile.caja_id ? `/caja/${profile.caja_id}` : '/login',
    COCINA: '/cocina',
    BODEGA: '/bodega',
    DOMICILIARIO: '/domicilio',
  }
  redirect(ROLE_HOME[profile.rol] ?? '/login')
}
