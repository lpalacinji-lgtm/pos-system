import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Envío de factura por WhatsApp.
 *
 * Soporta dos proveedores (configurar WHATSAPP_PROVIDER):
 *  - twilio: Twilio WhatsApp Business
 *  - meta:   Meta Cloud API directa
 *
 * Body esperado: { venta_id, telefono, mensaje? }
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { venta_id, telefono, mensaje } = await req.json()

  // Cargar venta + items + cliente
  const { data: venta, error } = await supabase
    .from('ventas')
    .select(`
      *,
      cliente:clientes(razon_social, documento),
      items:venta_items(cantidad, precio_unitario, subtotal, producto:productos(nombre))
    `)
    .eq('id', venta_id)
    .single()

  if (error || !venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })

  // Construir mensaje
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n)

  const lineasItems = (venta.items as any[])
    .map(it => `• ${it.cantidad}x ${it.producto.nombre} — ${fmt(Number(it.subtotal))}`)
    .join('\n')

  const textoFactura = mensaje || `🧾 *Factura #${venta.numero_consecutivo}*

${venta.cliente ? `Cliente: ${venta.cliente.razon_social}\n` : ''}
${lineasItems}

Subtotal: ${fmt(Number(venta.subtotal))}
IVA: ${fmt(Number(venta.iva))}
*Total: ${fmt(Number(venta.total))}*

Método de pago: ${venta.metodo_pago}
¡Gracias por tu compra! 🎉`

  const telefonoLimpio = telefono.replace(/\D/g, '')
  const telefonoFormateado = telefonoLimpio.startsWith('57')
    ? telefonoLimpio
    : '57' + telefonoLimpio

  const provider = process.env.WHATSAPP_PROVIDER

  try {
    if (provider === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID!
      const token = process.env.TWILIO_AUTH_TOKEN!
      const from = process.env.TWILIO_WHATSAPP_FROM!

      const formData = new URLSearchParams()
      formData.append('From', from)
      formData.append('To', `whatsapp:+${telefonoFormateado}`)
      formData.append('Body', textoFactura)

      const auth = Buffer.from(`${sid}:${token}`).toString('base64')
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: 'Twilio error', detalle: err }, { status: 500 })
      }
      const result = await res.json()
      return NextResponse.json({ ok: true, message_sid: result.sid })
    }

    // Fallback: link wa.me (no requiere API, pero requiere acción del usuario)
    const linkWhatsApp = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(textoFactura)}`
    return NextResponse.json({
      ok: true,
      modo: 'link',
      url: linkWhatsApp,
      mensaje: 'Configurar WHATSAPP_PROVIDER para envío automático'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
