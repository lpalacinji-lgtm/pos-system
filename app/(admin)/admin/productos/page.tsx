import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductosModule from '@/components/admin/ProductosModule'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase.from('productos').select('*, categoria:categorias(nombre)').order('nombre'),
    supabase.from('categorias').select('*').order('nombre'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Productos &amp; Categorías</h1>
        <p className="text-slate-500">Catálogo de venta del POS</p>
      </div>
      <ProductosModule
        productosIniciales={productos ?? []}
        categoriasIniciales={categorias ?? []}
      />
    </div>
  )
}
