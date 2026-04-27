'use client'

import { useState, useEffect } from 'react'

export type ClienteData = {
  id?: string
  nit: string
  nombre: string
  telefono?: string | null
  email?: string | null
  persona_tipo?: 'NATURAL' | 'JURIDICA'
  tipo_documento?: 'CC' | 'CE' | 'PA' | 'TI' | 'NIT' | 'NUIP'
  digito_verificacion?: string | null
  razon_social?: string | null
  direccion?: string | null
  departamento?: string | null
  municipio?: string | null
  regimen_iva?: 'RESPONSABLE' | 'NO_RESPONSABLE' | 'GRAN_CONTRIBUYENTE' | 'REGIMEN_SIMPLE' | null
  actividad_ciiu?: string | null
}

export default function ClienteFormFields({
  tipoFactura,
  cliente,
  onChange,
}: {
  tipoFactura: 'POS' | 'ELECTRONICA'
  cliente: ClienteData
  onChange: (c: ClienteData) => void
}) {
  const [personaTipo, setPersonaTipo] = useState<'NATURAL' | 'JURIDICA'>(
    cliente.persona_tipo ?? 'NATURAL'
  )

  // Si cambia tipo factura, asegurar defaults razonables
  useEffect(() => {
    if (tipoFactura === 'POS') {
      // POS: solo nit + nombre (+ tel opcional)
      onChange({
        ...cliente,
        persona_tipo: 'NATURAL',
        tipo_documento: cliente.tipo_documento ?? 'CC',
      })
    }
    // eslint-disable-next-line
  }, [tipoFactura])

  const update = (patch: Partial<ClienteData>) => {
    onChange({ ...cliente, ...patch })
  }

  // ========= MODO POS =========
  if (tipoFactura === 'POS') {
    return (
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600 font-medium">
            Cédula / NIT
          </label>
          <input
            value={cliente.nit ?? ''}
            onChange={(e) => update({ nit: e.target.value })}
            placeholder="1014..."
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">Nombre</label>
          <input
            value={cliente.nombre ?? ''}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Nombre completo"
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">
            Teléfono (opcional)
          </label>
          <input
            value={cliente.telefono ?? ''}
            onChange={(e) => update({ telefono: e.target.value })}
            placeholder="3001234567"
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>
    )
  }

  // ========= MODO ELECTRÓNICA =========
  return (
    <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-xs text-blue-700 font-bold">
        📋 Factura Electrónica DIAN — datos completos requeridos
      </p>

      {/* Toggle persona */}
      <div>
        <label className="text-xs text-gray-700 font-medium block mb-1">
          Tipo de persona
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setPersonaTipo('NATURAL')
              update({ persona_tipo: 'NATURAL', tipo_documento: 'CC' })
            }}
            className={`py-2 rounded-lg border text-sm font-medium ${
              personaTipo === 'NATURAL'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white border-gray-300'
            }`}
          >
            👤 Natural
          </button>
          <button
            type="button"
            onClick={() => {
              setPersonaTipo('JURIDICA')
              update({ persona_tipo: 'JURIDICA', tipo_documento: 'NIT' })
            }}
            className={`py-2 rounded-lg border text-sm font-medium ${
              personaTipo === 'JURIDICA'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white border-gray-300'
            }`}
          >
            🏢 Jurídica
          </button>
        </div>
      </div>

      {/* Persona Natural */}
      {personaTipo === 'NATURAL' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-xs text-gray-700 font-medium">
                Tipo doc
              </label>
              <select
                value={cliente.tipo_documento ?? 'CC'}
                onChange={(e) =>
                  update({ tipo_documento: e.target.value as any })
                }
                className="w-full border rounded-lg px-2 py-2 mt-1 bg-white text-sm"
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PA">Pasaporte</option>
                <option value="TI">TI</option>
                <option value="NUIP">NUIP</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-700 font-medium">Número</label>
              <input
                value={cliente.nit ?? ''}
                onChange={(e) => update({ nit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-700 font-medium">
              Nombre completo *
            </label>
            <input
              value={cliente.nombre ?? ''}
              onChange={(e) => update({ nombre: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </>
      )}

      {/* Persona Jurídica */}
      {personaTipo === 'JURIDICA' && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <label className="text-xs text-gray-700 font-medium">NIT *</label>
              <input
                value={cliente.nit ?? ''}
                onChange={(e) => update({ nit: e.target.value })}
                placeholder="900123456"
                className="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-gray-700 font-medium">DV</label>
              <input
                value={cliente.digito_verificacion ?? ''}
                onChange={(e) =>
                  update({ digito_verificacion: e.target.value.slice(0, 1) })
                }
                placeholder="7"
                maxLength={1}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-center"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-700 font-medium">
              Razón social *
            </label>
            <input
              value={cliente.razon_social ?? cliente.nombre ?? ''}
              onChange={(e) =>
                update({ razon_social: e.target.value, nombre: e.target.value })
              }
              placeholder="EMPRESA SAS"
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-700 font-medium">
              Régimen IVA
            </label>
            <select
              value={cliente.regimen_iva ?? 'RESPONSABLE'}
              onChange={(e) => update({ regimen_iva: e.target.value as any })}
              className="w-full border rounded-lg px-3 py-2 mt-1 bg-white"
            >
              <option value="RESPONSABLE">Responsable de IVA</option>
              <option value="NO_RESPONSABLE">No responsable de IVA</option>
              <option value="GRAN_CONTRIBUYENTE">Gran contribuyente</option>
              <option value="REGIMEN_SIMPLE">Régimen simple</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-700 font-medium">
              Actividad económica (CIIU, opcional)
            </label>
            <input
              value={cliente.actividad_ciiu ?? ''}
              onChange={(e) => update({ actividad_ciiu: e.target.value })}
              placeholder="5611"
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </>
      )}

      {/* Comunes electrónica */}
      <div>
        <label className="text-xs text-gray-700 font-medium">Email *</label>
        <input
          type="email"
          value={cliente.email ?? ''}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="cliente@correo.com"
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          La factura DIAN se envía a este correo
        </p>
      </div>
      <div>
        <label className="text-xs text-gray-700 font-medium">Teléfono</label>
        <input
          value={cliente.telefono ?? ''}
          onChange={(e) => update({ telefono: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-gray-700 font-medium">Dirección</label>
        <input
          value={cliente.direccion ?? ''}
          onChange={(e) => update({ direccion: e.target.value })}
          placeholder="Cra 50 #80-45"
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-700 font-medium">
            Departamento
          </label>
          <input
            value={cliente.departamento ?? ''}
            onChange={(e) => update({ departamento: e.target.value })}
            placeholder="Atlántico"
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-700 font-medium">Municipio</label>
          <input
            value={cliente.municipio ?? ''}
            onChange={(e) => update({ municipio: e.target.value })}
            placeholder="Cartagena"
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>
    </div>
  )
}
