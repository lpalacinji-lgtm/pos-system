'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeProvider'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/usuarios', label: 'Usuarios y Cajas', icon: '👥' },
  { href: '/admin/productos', label: 'Productos', icon: '🍕' },
  { href: '/admin/recetas', label: 'Escandallos', icon: '📋' },
  { href: '/admin/cierres', label: 'Cierre de Caja', icon: '🔒' },
  { href: '/admin/reportes', label: 'Reportes', icon: '📈' },
  { href: '/admin/auditoria', label: 'Auditoría Bodega', icon: '🔍' },
]

export default function AdminSidebar({ nombre }: { nombre: string }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Botón móvil */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-xl shadow-lg"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: mobileOpen ? 0 : '-100%',
        }}
        className="md:!translate-x-0 fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-elevated)] border-r border-[var(--border)] z-40 flex flex-col p-5"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-orange-600 flex items-center justify-center text-white text-lg shadow-lg">
            ⚡
          </div>
          <div>
            <h1 className="font-display text-xl leading-none">POS</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Profile */}
        <div className="mb-6 p-3 bg-[var(--bg-subtle)] rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{nombre}</p>
              <p className="text-xs text-[var(--text-muted)]">Administrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'bg-[var(--brand)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="active-dot"
                    className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-[var(--text-muted)]">Tema</span>
            <ThemeToggle />
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </motion.aside>
    </>
  )
}
