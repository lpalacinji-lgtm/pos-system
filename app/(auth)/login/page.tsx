'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeProvider'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const errorParam = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    if (!data.user) {
      setError('No se pudo iniciar sesión')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, caja_id, activo')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile?.activo) {
      setError('Tu usuario está desactivado')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    const ROLE_HOME: Record<string, string> = {
      ADMIN: '/admin',
      CAJERA: profile.caja_id ? `/caja/${profile.caja_id}` : '/login',
      COCINA: '/cocina',
      BODEGA: '/bodega',
      DOMICILIARIO: '/domicilio',
    }

    const home = ROLE_HOME[profile.rol] ?? '/login'
    window.location.href = home
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[var(--bg)]">
      {/* Panel izquierdo - branding */}
      <div className="hidden lg:flex relative overflow-hidden bg-[var(--brand)] text-white p-12 flex-col justify-between">
        {/* Patrón de fondo */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 75% 70%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px, 40px 40px',
          }}
        />
        {/* Blob decorativo */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-black/10 blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-2xl">🍕</span>
            </div>
            POS Profesional
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="font-display text-6xl leading-none mb-4">
            Vende mejor.
            <br />
            <em className="opacity-90">Vende rápido.</em>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Sistema completo de punto de venta con gestión de inventario, cocina,
            domicilios y reportes en tiempo real.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4 max-w-md"
        >
          {[
            { num: '24/7', label: 'Disponibilidad' },
            { num: '5 roles', label: 'Operativos' },
            { num: '<1s', label: 'Tiempo de cobro' },
          ].map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-3"
            >
              <div className="font-display text-2xl">{s.num}</div>
              <div className="text-xs text-white/70 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex flex-col px-6 py-8 lg:p-12 relative">
        {/* Header móvil */}
        <div className="flex items-center justify-between mb-8 lg:mb-0">
          <div className="lg:hidden flex items-center gap-2 text-xl font-bold">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center">
              <span>🍕</span>
            </div>
            POS Pro
          </div>
          <ThemeToggle className="lg:absolute lg:top-6 lg:right-6 ml-auto" />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-5xl mb-2 text-balance">
              Bienvenido <em>de vuelta</em>
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Ingresa con tus credenciales para continuar.
            </p>
          </motion.div>

          {(error || errorParam === 'inactive') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 text-[var(--accent-error)] rounded-xl px-4 py-3 text-sm"
            >
              {errorParam === 'inactive'
                ? 'Tu sesión expiró o tu usuario fue desactivado.'
                : error}
            </motion.div>
          )}

          <motion.form
            onSubmit={handleLogin}
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoFocus
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-2"
                  tabIndex={-1}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary w-full !py-4 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                <>Ingresar →</>
              )}
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-[var(--text-muted)] text-center mt-8"
          >
            Si tienes problemas para ingresar, contacta a tu administrador.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-[var(--text-muted)] mt-8"
        >
          © {new Date().getFullYear()} POS Profesional · Hecho con ❤️ en Colombia
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
      <LoginForm />
    </Suspense>
  )
}
