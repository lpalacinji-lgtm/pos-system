import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()
  if (profile?.rol !== 'ADMIN') redirect('/')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)]">
      <AdminSidebar nombre={profile.nombre} />
      <main className="flex-1 overflow-y-auto md:ml-64">
        {children}
      </main>
    </div>
  )
}
