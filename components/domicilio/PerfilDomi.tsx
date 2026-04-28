'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeProvider'

export default function PerfilDomi({
  nombre,
  email,
  telefono,
  memberSince,
  totalEntregas,
}: {
  nombre: string
  email: string
  telefono: string | null
  memberSince: string
  totalEntregas: number
}) {
  const supabase = createClient()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="pb-24 min-h-screen bg-[var(--bg)]">
      <div className="p-4 space-y-4">
        <h2 className="font-display text-3xl">Mi perfil</h2>

        {/* Avatar grande */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 flex items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand)] to-orange-600 text-white flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl">{nombre}</h3>
            <p className="text-sm text-[var(--text-muted)] truncate">{email}</p>
            {telefono && (
              <p className="text-sm text-[var(--text-muted)]">{telefono}</p>
            )}
            <span className="inline-block mt-1 badge bg-[var(--brand-soft)] text-[var(--brand)]">
              🛵 Domiciliario
            </span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <p className="text-xs text-[var(--text-muted)] uppercase font-semibold">
            Entregas totales
          </p>
          <p className="font-display text-5xl">{totalEntregas}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Desde {new Date(memberSince).toLocaleDateString('es-CO', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </motion.div>

        {/* Acciones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">Tema</p>
              <p className="text-xs text-[var(--text-muted)]">
                Claro u oscuro según prefieras
              </p>
            </div>
            <ThemeToggle />
          </div>

          <Link href="/domicilio/historial" className="card p-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition">
            <div>
              <p className="font-semibold">Mi historial</p>
              <p className="text-xs text-[var(--text-muted)]">
                Ver entregas y reportes
              </p>
            </div>
            <span className="text-[var(--text-muted)]">→</span>
          </Link>

          <button
            onClick={cerrarSesion}
            className="card w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition"
          >
            <div className="text-left">
              <p className="font-semibold">Cerrar sesión</p>
              <p className="text-xs text-red-500/70">Salir del sistema</p>
            </div>
            <span>→</span>
          </button>
        </motion.div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-elevated)] border-t border-[var(--border)] safe-bottom z-30 glass">
        <div className="flex">
          <Link
            href="/domicilio"
            className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--text-muted)]"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-bold">Inicio</span>
          </Link>
          <Link
            href="/domicilio/historial"
            className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--text-muted)]"
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-bold">Historial</span>
          </Link>
          <Link
            href="/domicilio/perfil"
            className="flex-1 py-3 flex flex-col items-center gap-1 text-[var(--brand)]"
          >
            <span className="text-xl">👤</span>
            <span className="text-xs font-bold">Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
