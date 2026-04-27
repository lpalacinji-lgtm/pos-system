import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  CAJERA: '/caja',
  COCINA: '/cocina',
  BODEGA: '/bodega',
  DOMICILIARIO: '/domicilio',
}

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/admin', '/caja', '/cocina', '/bodega', '/domicilio', '/recibo', '/comanda'],
  CAJERA: ['/caja', '/recibo', '/comanda'],
  COCINA: ['/cocina', '/comanda'],
  BODEGA: ['/bodega'],
  DOMICILIARIO: ['/domicilio'],
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname

  // Rutas que el middleware no procesa (defensa adicional al matcher)
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path === '/manifest.json' ||
    path === '/sw.js' ||
    path === '/favicon.ico'
  ) {
    return response
  }

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Si auth falla, tratar como anónimo
  }

  // Login: si no hay sesión, dejar pasar; si hay sesión, redirigir a home (UNA SOLA VEZ)
  if (path === '/login') {
    if (!user) return response
    // Si hay sesión, intenta llevar al home — si falla la query, no redirijas (evita loops)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol, caja_id, activo')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.activo && profile.rol) {
        const home =
          profile.rol === 'CAJERA' && profile.caja_id
            ? `/caja/${profile.caja_id}`
            : ROLE_HOME[profile.rol] ?? '/login'
        if (home !== '/login') {
          return NextResponse.redirect(new URL(home, request.url))
        }
      }
    } catch {
      // si falla, deja al usuario en /login para no entrar en loop
    }
    return response
  }

  // Raíz: deja que page.tsx decida (renderiza server component)
  if (path === '/') {
    return response
  }

  // Cualquier otra ruta requiere sesión
  if (!user) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // Cargar profile (defensivamente)
  let profile: { rol: string | null; caja_id: string | null; activo: boolean | null } | null = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('rol, caja_id, activo')
      .eq('id', user.id)
      .maybeSingle()
    profile = data as any
  } catch {
    profile = null
  }

  // Si no hay profile o está inactivo, redirige a login con flag (sin signOut)
  if (!profile || !profile.activo || !profile.rol) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'inactive')
    return NextResponse.redirect(url)
  }

  const allowedRoutes = ROLE_ROUTES[profile.rol] ?? []
  const isAllowed = allowedRoutes.some((r) => path.startsWith(r))

  if (!isAllowed) {
    const home =
      profile.rol === 'CAJERA' && profile.caja_id
        ? `/caja/${profile.caja_id}`
        : ROLE_HOME[profile.rol] ?? '/login'
    if (home === path) return response // evita auto-redirect loop
    return NextResponse.redirect(new URL(home, request.url))
  }

  // CAJERA solo puede entrar a su propia caja
  if (profile.rol === 'CAJERA' && path.startsWith('/caja/')) {
    const cajaIdEnUrl = path.split('/')[2]
    if (cajaIdEnUrl && profile.caja_id && cajaIdEnUrl !== profile.caja_id) {
      return NextResponse.redirect(new URL(`/caja/${profile.caja_id}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ico)$).*)',
  ],
}
