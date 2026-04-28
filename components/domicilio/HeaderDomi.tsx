'use client'

import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ThemeProvider'
import { createClient } from '@/lib/supabase/client'

export default function HeaderDomi({ nombre }: { nombre: string }) {
  const supabase = createClient()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-[var(--brand)] text-white p-4 sticky top-0 z-30 safe-top"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs opacity-90">Hola,</p>
            <p className="font-bold leading-tight">{nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="!bg-white/15 !border-white/20 !text-white hover:!bg-white/25" />
          <button
            onClick={cerrarSesion}
            className="bg-white/15 backdrop-blur hover:bg-white/25 text-white rounded-xl px-3 py-2 text-xs font-semibold border border-white/20"
          >
            Salir
          </button>
        </div>
      </div>
    </motion.header>
  )
}
