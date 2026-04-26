import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('nombre, rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-900 text-white md:min-h-screen p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-emerald-400">POS Admin</h1>
          <p className="text-xs text-gray-400 mt-1">{profile?.nombre}</p>
        </div>
        <nav className="space-y-1">
          <NavLink href="/admin" label="📊 Dashboard" />
          <NavLink href="/admin/usuarios" label="👥 Usuarios y Cajas" />
          <NavLink href="/admin/productos" label="🍕 Productos" />
          <NavLink href="/admin/recetas" label="📋 Escandallos" />
          <NavLink href="/admin/reportes" label="📈 Reportes" />
          <NavLink href="/admin/auditoria" label="🔍 Auditoría Bodega" />
        </nav>
        <div className="mt-8 pt-4 border-t border-gray-800">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-y-auto">{children}</main>
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-sm transition">
      {label}
    </Link>
  )
}
