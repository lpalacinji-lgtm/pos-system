import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Búsqueda de NIT/CC para autollenar datos de cliente.
 *
 * Estrategia:
 * 1. Buscar primero en la tabla `clientes` local (clientes recurrentes)
 * 2. Si no existe, consultar API externa (configurar NIT_API_URL)
 * 3. Devolver datos formateados y guardar en cache local
 *
 * Proveedores sugeridos en Colombia:
 *  - RUES (oficial): https://rues.org.co (requiere scraping o convenio)
 *  - apinit.co (paga, fácil integración)
 *  - Servicios como Alegra/Siigo exponen este lookup en su API
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ nit: string }> }
) {
  const { nit } = await params
  const documento = nit.replace(/\D/g, '') // limpiar guiones, puntos

  if (!documento || documento.length < 6) {
    return NextResponse.json({ error: 'Documento inválido' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Buscar en local
  const { data: cliente } = await supabase
    .from('clientes').select('*').eq('documento', documento).maybeSingle()

  if (cliente) {
    return NextResponse.json({ source: 'local', cliente })
  }

  // 2. Consultar API externa si está configurada
  const apiUrl = process.env.NIT_API_URL
  const apiToken = process.env.NIT_API_TOKEN

  if (!apiUrl) {
    return NextResponse.json({
      source: 'none',
      cliente: null,
      mensaje: 'NIT no encontrado localmente. API externa no configurada.'
    })
  }

  try {
    const apiRes = await fetch(`${apiUrl}/${documento}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!apiRes.ok) {
      return NextResponse.json({ source: 'api_error', cliente: null })
    }

    const data = await apiRes.json()

    // Mapear respuesta del proveedor a nuestro formato
    // (ajustar según el proveedor que uses)
    const clienteData = {
      documento,
      tipo_documento: data.tipo_documento || 'NIT',
      razon_social: data.razon_social || data.nombre,
      direccion: data.direccion,
      ciudad: data.ciudad,
      regimen_tributario: data.regimen_tributario,
      telefono: data.telefono,
      email: data.email,
    }

    return NextResponse.json({ source: 'api', cliente: clienteData })
  } catch (err: any) {
    return NextResponse.json({
      source: 'api_error',
      cliente: null,
      error: err.message
    })
  }
}
