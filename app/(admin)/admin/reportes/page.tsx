import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesModule from '@/components/admin/ReportesModule'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  const { data: cajas } = await supabase
    .from('cajas')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        <p className="text-slate-500">Ventas por período, método de pago y caja</p>
      </div>
      <ReportesModule cajas={cajas ?? []} />
    </div>
  )
}
