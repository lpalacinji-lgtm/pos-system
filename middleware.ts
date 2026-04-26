import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/admin', '/caja', '/cocina', '/bodega', '/domicilio'],
  CAJERA: ['/caja'],
  COCINA: ['/cocina'],
  BODEGA: ['/bodega'],
  DOMICILIARIO: ['/domicilio'],
}

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  CAJERA: '/caja',
  COCINA: '/cocina',
  BODEGA: '/bodega',
  DOMICILIARIO: '/domicilio',
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

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Rutas públicas
  if (path.startsWith('/login') || path.startsWith('/_next') || path === '/') {
    if (user && path === '/login') {
      const { data: profile } = await supabase
        .from('profiles').select('rol, caja_id, activo').eq('id', user.id).single()

      if (profile?.activo) {
        const home = profile.rol === 'CAJERA' && profile.caja_id
          ? `/caja/${profile.caja_id}`
          : ROLE_HOME[profile.rol]
        return NextResponse.redirect(new URL(home, request.url))
      }
    }
    return response
  }

  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: profile } = await supabase
    .from('profiles').select('rol, caja_id, activo').eq('id', user.id).single()

  if (!profile || !profile.activo) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  const allowedRoutes = ROLE_ROUTES[profile.rol] || []
  const isAllowed = allowedRoutes.some(route => path.startsWith(route))

  if (!isAllowed) {
    const home = profile.rol === 'CAJERA' && profile.caja_id
      ? `/caja/${profile.caja_id}`
      : ROLE_HOME[profile.rol]
    return NextResponse.redirect(new URL(home, request.url))
  }

  // CAJERA solo a su caja asignada
  if (profile.rol === 'CAJERA' && path.startsWith('/caja/')) {
    const cajaIdEnUrl = path.split('/')[2]
    if (cajaIdEnUrl && cajaIdEnUrl !== profile.caja_id) {
      return NextResponse.redirect(new URL(`/caja/${profile.caja_id}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)'],
}
