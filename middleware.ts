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
  ADMIN: ['/admin', '/caja', '/cocina', '/bodega', '/domicilio'],
  CAJERA: ['/caja'],
  COCINA: ['/cocina'],
  BODEGA: ['/bodega'],
  DOMICILIARIO: ['/domicilio'],
}

export function middleware() {
  // intencionalmente vacío para debugging
}

export const config = {
  matcher: [],
}

