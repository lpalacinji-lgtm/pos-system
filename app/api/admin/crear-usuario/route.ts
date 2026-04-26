import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Validar admin
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo admin puede crear usuarios' }, { status: 403 })
  }

  const body = await req.json()

  // Validaciones básicas
  if (!body.email || !body.password || !body.nombre || !body.rol) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (body.rol === 'CAJERA' && !body.caja_id) {
    return NextResponse.json({ error: 'CAJERA requiere caja_id' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: authData.user.id,
    email: body.email,
    nombre: body.nombre,
    rol: body.rol,
    caja_id: body.rol === 'CAJERA' ? body.caja_id : null,
    telefono: body.telefono,
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, user_id: authData.user.id })
}
