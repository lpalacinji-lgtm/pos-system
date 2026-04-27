import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuadreActual from '@/components/caja/CuadreActual'

export const dynamic = 'force-dynamic'

export default async function CuadrePage({
  params,
}: {
  params: Promise<{ cajaId: string }>
}) {
  const { cajaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre, caja_id').eq('id', user.id).single()
  if (!profile || !['CAJERA', 'ADMIN'].includes(profile.rol)) redirect('/')

  const { data: caja } = await supabase
    .from('cajas').select('*').eq('id', cajaId).single()
  if (!caja) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Cuadre actual — {caja.nombre}</h1>
          <p className="text-xs opacity-80">{profile.nombre}</p>
        </div>
        <Link
          href={`/caja/${cajaId}`}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          ← Volver al POS
        </Link>
      </header>
      <CuadreActual cajaId={cajaId} />
    </div>
  )
}
