'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={logout}
      className={`text-sm text-gray-300 hover:text-white transition ${className}`}>
      Cerrar sesión
    </button>
  )
}
