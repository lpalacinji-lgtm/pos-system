'use client'

import { useEffect, useState } from 'react'

type Item = {
  cantidad: number
  observacion: string | null
  producto: {
    codigo: string
    nombre: string
    tiempo_preparacion_min: number | null
  }
}

type Venta = {
  id: string
  numero_consecutivo: number
  created_at: string
  estado: string
  es_domicilio: boolean
  direccion_entrega: string | null
  observaciones: string | null
  caja: { nombre: string } | null
  cajera: { nombre: string } | null
  cliente: { nombre: string | null; telefono: string | null } | null
  items: Item[]
}

export default function ComandaImprimible({ venta }: { venta: Venta }) {
  const [autoImpreso, setAutoImpreso] = useState(false)

  // Title dinámico
  useEffect(() => {
    const fecha = new Date(venta.created_at)
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    document.title = `Comanda-${venta.numero_consecutivo}-${yyyy}-${mm}-${dd}`
  }, [venta])

  // Auto print
  useEffect(() => {
    if (!autoImpreso) {
      const t = setTimeout(() => {
        window.print()
        setAutoImpreso(true)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [autoImpreso])

  const fecha = new Date(venta.created_at)
  const horaStr = fecha.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const tiempoMax = Math.max(
    0,
    ...venta.items.map((i) => i.producto.tiempo_preparacion_min ?? 0)
  )

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
          .comanda {
            width: 80mm !important;
            padding: 2mm !important;
            box-shadow: none !important;
          }
        }

        body {
          background: #f3f4f6;
          font-family: 'Courier New', Courier, monospace;
        }

        .comanda {
          width: 80mm;
          margin: 16px auto;
          padding: 4mm;
          background: white;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.4;
          color: black;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .comanda .center { text-align: center; }
        .comanda .bold { font-weight: bold; }
        .comanda .xl { font-size: 22px; font-weight: bold; }
        .comanda .lg { font-size: 16px; font-weight: bold; }
        .comanda hr {
          border: none;
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        .comanda .item {
          padding: 6px 0;
          border-bottom: 1px dashed #999;
        }
        .comanda .item:last-child {
          border-bottom: none;
        }
        .comanda .qty {
          font-size: 28px;
          font-weight: bold;
          margin-right: 6px;
        }
        .comanda .obs {
          background: #fff8c4;
          border: 2px solid #000;
          padding: 4px 6px;
          margin-top: 4px;
          font-weight: bold;
          font-size: 13px;
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
          🖨️ Imprimir comanda
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

      <div className="comanda">
        <div className="center bold lg">🍳 COCINA</div>
        <div className="center xl">#{venta.numero_consecutivo}</div>

        <hr />

        <div>
          Hora: <span className="bold">{horaStr}</span>
        </div>
        {venta.caja && <div>Caja: {venta.caja.nombre}</div>}
        {venta.cajera && <div>Cajera: {venta.cajera.nombre}</div>}
        {tiempoMax > 0 && (
          <div className="bold">⏱ Tiempo objetivo: {tiempoMax} min</div>
        )}

        {venta.es_domicilio && (
          <div
            style={{
              marginTop: '6px',
              padding: '4px',
              background: '#fed7aa',
              border: '1px solid #ea580c',
              fontWeight: 'bold',
            }}
          >
            🛵 PARA DOMICILIO
          </div>
        )}

        {venta.cliente?.nombre && (
          <div style={{ marginTop: '4px' }}>
            Cliente: <span className="bold">{venta.cliente.nombre}</span>
          </div>
        )}

        <hr />

        <div>
          {venta.items.map((it, i) => (
            <div key={i} className="item">
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="qty">{it.cantidad}×</span>
                <span className="lg">{it.producto.nombre}</span>
              </div>
              {it.observacion && (
                <div className="obs">⚠️ {it.observacion}</div>
              )}
            </div>
          ))}
        </div>

        {venta.observaciones && (
          <>
            <hr />
            <div className="bold">Observación general:</div>
            <div className="obs">{venta.observaciones}</div>
          </>
        )}

        <div style={{ height: '20mm' }} />
      </div>
    </>
  )
}
