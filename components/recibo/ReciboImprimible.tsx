'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

type Item = {
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  subtotal: number
  total: number
  observacion: string | null
  producto: { codigo: string; nombre: string }
}

type Venta = {
  id: string
  numero_consecutivo: number
  created_at: string
  subtotal: number
  iva: number
  descuento: number | null
  total: number
  valor_domicilio: number | null
  metodo_pago: string
  tipo_factura: string
  es_domicilio: boolean
  direccion_entrega: string | null
  observaciones: string | null
  cufe: string | null
  qr_url: string | null
  caja: { nombre: string; ubicacion: string | null } | null
  cajera: { nombre: string } | null
  domiciliario: { nombre: string; telefono: string | null } | null
  cliente: {
    nit: string | null
    nombre: string | null
    telefono: string | null
    direccion: string | null
  } | null
  items: Item[]
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

// Datos de la empresa - editar aquí o mover a tabla "config"
const EMPRESA = {
  nombre: 'MI NEGOCIO POS',
  nit: '900.123.456-7',
  direccion: 'Cra 50 #80-45, Cartagena',
  telefono: '(605) 555-1234',
  regimen: 'No responsable de IVA',
}

export default function ReciboImprimible({ venta }: { venta: Venta }) {
  const [autoImpreso, setAutoImpreso] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const qrTextoRef = useRef<string>('')

  // Title dinámico: el navegador lo usa como nombre del PDF al imprimir
  useEffect(() => {
    const fecha = new Date(venta.created_at)
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    document.title = `Factura-${venta.numero_consecutivo}-${yyyy}-${mm}-${dd}`
  }, [venta])

  // Genera el QR cuando se monta
  useEffect(() => {
    // Prioridad: cufe (DIAN) > qr_url > UUID + número como respaldo
    const texto =
      venta.cufe ??
      venta.qr_url ??
      `POS#${venta.numero_consecutivo}|${venta.id}|${fmtCOP(venta.total)}`
    qrTextoRef.current = texto
    QRCode.toDataURL(texto, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''))
  }, [venta])

  // Auto-imprime al cargar (después de 600ms para que el QR termine)
  useEffect(() => {
    if (!autoImpreso && qrDataUrl) {
      const t = setTimeout(() => {
        window.print()
        setAutoImpreso(true)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [autoImpreso, qrDataUrl])

  const fecha = new Date(venta.created_at)
  const fechaStr = fecha.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const valDomicilio = Number(venta.valor_domicilio ?? 0)

  return (
    <>
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .recibo {
            width: 80mm !important;
            padding: 2mm !important;
            box-shadow: none !important;
          }
        }

        body {
          background: #f3f4f6;
          font-family: 'Courier New', Courier, monospace;
        }

        .recibo {
          width: 80mm;
          margin: 16px auto;
          padding: 4mm;
          background: white;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.3;
          color: black;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .recibo .center { text-align: center; }
        .recibo .right { text-align: right; }
        .recibo .bold { font-weight: bold; }
        .recibo .big { font-size: 13px; font-weight: bold; }
        .recibo .xl { font-size: 16px; font-weight: bold; }
        .recibo hr {
          border: none;
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .recibo table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .recibo .item-row td {
          padding: 1px 0;
          vertical-align: top;
        }
        .recibo .totals td {
          padding: 2px 0;
        }
        .recibo .qr {
          display: block;
          margin: 8px auto;
          width: 28mm;
          height: 28mm;
        }
      `}</style>

      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          background: '#1f2937',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: '#10b981',
            color: 'white',
            padding: '8px 24px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: '#4b5563',
            color: 'white',
            padding: '8px 24px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ✕ Cerrar
        </button>
      </div>

      <div className="recibo">
        <div className="center bold big">{EMPRESA.nombre}</div>
        <div className="center">NIT {EMPRESA.nit}</div>
        <div className="center">{EMPRESA.direccion}</div>
        <div className="center">Tel: {EMPRESA.telefono}</div>
        <div className="center" style={{ fontSize: '9px' }}>
          {EMPRESA.regimen}
        </div>

        <hr />

        <div className="center bold">
          {venta.tipo_factura === 'ELECTRONICA'
            ? 'FACTURA ELECTRÓNICA DE VENTA'
            : 'TICKET POS'}
        </div>
        <div className="center xl">No. {venta.numero_consecutivo}</div>

        <hr />

        <div>Fecha: {fechaStr}</div>
        {venta.caja && <div>Caja: {venta.caja.nombre}</div>}
        {venta.cajera && <div>Cajera: {venta.cajera.nombre}</div>}

        {venta.cliente && (venta.cliente.nit || venta.cliente.nombre) && (
          <>
            <hr />
            <div className="bold">CLIENTE</div>
            {venta.cliente.nit && <div>NIT/CC: {venta.cliente.nit}</div>}
            {venta.cliente.nombre && <div>{venta.cliente.nombre}</div>}
            {venta.cliente.telefono && <div>Tel: {venta.cliente.telefono}</div>}
            {venta.cliente.direccion && <div>{venta.cliente.direccion}</div>}
          </>
        )}

        {venta.es_domicilio && (
          <>
            <hr />
            <div className="bold">🛵 DOMICILIO</div>
            {venta.direccion_entrega && <div>{venta.direccion_entrega}</div>}
            {venta.domiciliario && (
              <div style={{ fontSize: '10px' }}>
                Domiciliario:{' '}
                <span className="bold">{venta.domiciliario.nombre}</span>
                {venta.domiciliario.telefono && ` · ${venta.domiciliario.telefono}`}
              </div>
            )}
          </>
        )}

        <hr />

        <table>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <td className="bold">DESCRIPCIÓN</td>
              <td className="bold right">VALOR</td>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((it, i) => (
              <tr key={i} className="item-row">
                <td colSpan={2}>
                  <div>{it.producto.nombre}</div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>
                      {fmtNum(it.cantidad)} x {fmtCOP(it.precio_unitario)}
                      {it.iva_porcentaje > 0 && ` (IVA ${it.iva_porcentaje}%)`}
                    </span>
                    <span className="bold">{fmtCOP(Number(it.total))}</span>
                  </div>
                  {it.observacion && (
                    <div style={{ fontSize: '9px', fontStyle: 'italic' }}>
                      ⚠️ {it.observacion}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        <table className="totals">
          <tbody>
            <tr>
              <td>Subtotal:</td>
              <td className="right">{fmtCOP(venta.subtotal)}</td>
            </tr>
            <tr>
              <td>IVA:</td>
              <td className="right">{fmtCOP(venta.iva)}</td>
            </tr>
            {Number(venta.descuento) > 0 && (
              <tr>
                <td>Descuento:</td>
                <td className="right">-{fmtCOP(Number(venta.descuento))}</td>
              </tr>
            )}
            {valDomicilio > 0 && (
              <tr>
                <td>Domicilio:</td>
                <td className="right">{fmtCOP(valDomicilio)}</td>
              </tr>
            )}
            <tr style={{ borderTop: '1px solid #000' }}>
              <td className="xl">TOTAL:</td>
              <td className="right xl">{fmtCOP(venta.total)}</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <div>
          Forma de pago: <span className="bold">{venta.metodo_pago}</span>
        </div>

        {venta.observaciones && (
          <>
            <hr />
            <div style={{ fontSize: '10px' }}>
              <span className="bold">Obs:</span> {venta.observaciones}
            </div>
          </>
        )}

        {/* QR */}
        {qrDataUrl && (
          <>
            <hr />
            <div className="center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR" className="qr" />
              {venta.cufe ? (
                <div style={{ fontSize: '8px', wordBreak: 'break-all' }}>
                  CUFE: {venta.cufe.slice(0, 24)}...
                </div>
              ) : (
                <div style={{ fontSize: '8px' }}>
                  Verificación de venta
                </div>
              )}
            </div>
          </>
        )}

        <hr />

        <div className="center" style={{ fontSize: '10px', marginTop: '8px' }}>
          ¡Gracias por su compra!
        </div>

        <div style={{ height: '20mm' }} />
      </div>
    </>
  )
}
