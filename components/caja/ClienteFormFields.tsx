'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  useEffect(() => {
    if (tipoFactura === 'POS') {
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

  // ─── MODO POS ──────────────────────────────────────────────
  if (tipoFactura === 'POS') {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
            Nombre
          </label>
          <input
            value={cliente.nombre ?? ''}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Nombre del cliente"
            className="input"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
            Teléfono <span className="text-[var(--text-muted)] normal-case">(opcional)</span>
          </label>
          <input
            value={cliente.telefono ?? ''}
            onChange={(e) => update({ telefono: e.target.value })}
            placeholder="3001234567"
            className="input"
          />
        </div>
      </div>
    )
  }

  // ─── MODO ELECTRÓNICA ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">📋</span>
        <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
          Factura Electrónica DIAN
        </p>
      </div>

      {/* Toggle persona */}
      <div>
        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-2">
          Tipo de persona
        </label>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setPersonaTipo('NATURAL')
              update({ persona_tipo: 'NATURAL', tipo_documento: 'CC' })
            }}
            className={`py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
              personaTipo === 'NATURAL'
                ? 'bg-[var(--brand)] text-white shadow-md'
                : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]'
            }`}
          >
            👤 Natural
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setPersonaTipo('JURIDICA')
              update({ persona_tipo: 'JURIDICA', tipo_documento: 'NIT' })
            }}
            className={`py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
              personaTipo === 'JURIDICA'
                ? 'bg-[var(--brand)] text-white shadow-md'
                : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]'
            }`}
          >
            🏢 Jurídica
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Persona Natural */}
        {personaTipo === 'NATURAL' && (
          <motion.div
            key="natural"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                  Tipo
                </label>
                <select
                  value={cliente.tipo_documento ?? 'CC'}
                  onChange={(e) => update({ tipo_documento: e.target.value as any })}
                  className="input text-sm"
                >
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PA">Pasaporte</option>
                  <option value="TI">TI</option>
                  <option value="NUIP">NUIP</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                  Número
                </label>
                <input
                  value={cliente.nit ?? ''}
                  onChange={(e) => update({ nit: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                Nombre completo *
              </label>
              <input
                value={cliente.nombre ?? ''}
                onChange={(e) => update({ nombre: e.target.value })}
                className="input"
              />
            </div>
          </motion.div>
        )}

        {/* Persona Jurídica */}
        {personaTipo === 'JURIDICA' && (
          <motion.div
            key="juridica"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                  NIT *
                </label>
                <input
                  value={cliente.nit ?? ''}
                  onChange={(e) => update({ nit: e.target.value })}
                  placeholder="900123456"
                  className="input"
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                  DV
                </label>
                <input
                  value={cliente.digito_verificacion ?? ''}
                  onChange={(e) =>
                    update({ digito_verificacion: e.target.value.slice(0, 1) })
                  }
                  placeholder="7"
                  maxLength={1}
                  className="input text-center"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                Razón social *
              </label>
              <input
                value={cliente.razon_social ?? cliente.nombre ?? ''}
                onChange={(e) =>
                  update({ razon_social: e.target.value, nombre: e.target.value })
                }
                placeholder="EMPRESA SAS"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                Régimen IVA
              </label>
              <select
                value={cliente.regimen_iva ?? 'RESPONSABLE'}
                onChange={(e) => update({ regimen_iva: e.target.value as any })}
                className="input"
              >
                <option value="RESPONSABLE">Responsable de IVA</option>
                <option value="NO_RESPONSABLE">No responsable de IVA</option>
                <option value="GRAN_CONTRIBUYENTE">Gran contribuyente</option>
                <option value="REGIMEN_SIMPLE">Régimen simple</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
                Actividad económica (CIIU)
              </label>
              <input
                value={cliente.actividad_ciiu ?? ''}
                onChange={(e) => update({ actividad_ciiu: e.target.value })}
                placeholder="5611"
                className="input"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comunes electrónica */}
      <div className="space-y-3 pt-3 border-t border-blue-200 dark:border-blue-900/50">
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
            ✉️ Email *
            <span className="text-[var(--text-muted)] normal-case ml-2 font-normal">
              La factura DIAN se envía aquí
            </span>
          </label>
          <input
            type="email"
            value={cliente.email ?? ''}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="cliente@correo.com"
            className="input"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
            📞 Teléfono
          </label>
          <input
            value={cliente.telefono ?? ''}
            onChange={(e) => update({ telefono: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
            📍 Dirección
          </label>
          <input
            value={cliente.direccion ?? ''}
            onChange={(e) => update({ direccion: e.target.value })}
            placeholder="Cra 50 #80-45"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
              Departamento
            </label>
            <input
              value={cliente.departamento ?? ''}
              onChange={(e) => update({ departamento: e.target.value })}
              placeholder="Bolívar"
              className="input"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide block mb-1.5">
              Municipio
            </label>
            <input
              value={cliente.municipio ?? ''}
              onChange={(e) => update({ municipio: e.target.value })}
              placeholder="Cartagena"
              className="input"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
