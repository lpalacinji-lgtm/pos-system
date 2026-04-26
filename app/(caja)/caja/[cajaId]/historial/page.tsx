import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HistorialModule from '@/components/caja/HistorialModule'

export const dynamic = 'force-dynamic'

export default async function HistorialPage({
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

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const [{ data: caja }, { data: ventas }, { data: domiciliarios }] = await Promise.all([
    supabase.from('cajas').select('*').eq('id', cajaId).single(),
    supabase
      .from('ventas')
      .select(
        `id, numero_consecutivo, created_at, estado, metodo_pago, tipo_factura,
         total, valor_domicilio, es_domicilio, direccion_entrega,
         domiciliario_id, domiciliario:profiles!ventas_domiciliario_id_fkey(nombre),
         cliente:clientes(nombre, nit)`
      )
      .eq('caja_id', cajaId)
      .gte('created_at', hoy.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, nombre')
      .eq('rol', 'DOMICILIARIO')
      .eq('activo', true)
      .order('nombre'),
  ])

  if (!caja) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Historial de hoy — {caja.nombre}</h1>
          <p className="text-xs opacity-80">{profile.nombre}</p>
        </div>
        <Link
          href={`/caja/${cajaId}`}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          ← Volver al POS
        </Link>
      </header>
      <main className="p-4">
        <HistorialModule
          ventas={(ventas ?? []) as any}
          domiciliarios={domiciliarios ?? []}
          cajaId={cajaId}
        />
      </main>
    </div>
  )
}
