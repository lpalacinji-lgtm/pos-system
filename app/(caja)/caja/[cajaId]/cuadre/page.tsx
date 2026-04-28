import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuadreActual from '@/components/caja/CuadreActual'
import { ThemeToggle } from '@/components/ThemeProvider'

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
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] px-5 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-orange-600 flex items-center justify-center text-white text-xl">
            📊
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">Cuadre</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {caja.nombre} · {profile.nombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/caja/${cajaId}`}
            className="btn btn-ghost text-sm !py-2"
          >
            ← Volver al POS
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <CuadreActual cajaId={cajaId} />
    </div>
  )
}
