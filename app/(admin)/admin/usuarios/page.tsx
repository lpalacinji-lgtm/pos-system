'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Caja = { id: string; nombre: string; ubicacion: string | null; activa: boolean }
type Profile = { id: string; email: string; nombre: string; rol: string; caja_id: string | null; activo: boolean }

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [cajas, setCajas] = useState<Caja[]>([])
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCajaModal, setShowCajaModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [cajasRes, usuariosRes] = await Promise.all([
      supabase.from('cajas').select('*').order('nombre'),
      supabase.from('profiles').select('*').order('nombre'),
    ])
    setCajas(cajasRes.data || [])
    setUsuarios(usuariosRes.data || [])
    setLoading(false)
  }

  async function crearCaja(formData: FormData) {
    const { error } = await supabase.from('cajas').insert({
      nombre: formData.get('nombre') as string,
      ubicacion: formData.get('ubicacion') as string,
    })
    if (error) return alert('Error: ' + error.message)
    setShowCajaModal(false)
    loadData()
  }

  async function crearUsuario(formData: FormData) {
    const res = await fetch('/api/admin/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
        nombre: formData.get('nombre'),
        rol: formData.get('rol'),
        caja_id: formData.get('caja_id') || null,
        telefono: formData.get('telefono'),
      }),
    })
    const result = await res.json()
    if (!res.ok) return alert('Error: ' + result.error)
    setShowUserModal(false)
    loadData()
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('profiles').update({ activo: !activo }).eq('id', id)
    loadData()
  }

  async function toggleCajaActiva(id: string, activa: boolean) {
    await supabase.from('cajas').update({ activa: !activa }).eq('id', id)
    loadData()
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="p-6 space-y-8">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Cajas / Puntos de Venta</h2>
          <button onClick={() => setShowCajaModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">
            + Nueva Caja
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cajas.map(c => (
            <div key={c.id} className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-lg">{c.nombre}</h3>
              <p className="text-sm text-gray-600">{c.ubicacion || 'Sin ubicación'}</p>
              <div className="flex justify-between items-center mt-3">
                <span className={`px-2 py-1 rounded text-xs ${c.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                  {c.activa ? 'Activa' : 'Inactiva'}
                </span>
                <button onClick={() => toggleCajaActiva(c.id, c.activa)}
                  className="text-xs text-blue-600 hover:underline">
                  {c.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Usuarios del Sistema</h2>
          <button onClick={() => setShowUserModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">
            + Nuevo Usuario
          </button>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caja</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {cajas.find(c => c.id === u.caja_id)?.nombre || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActivo(u.id, u.activo)}
                      className="text-sm text-blue-600 hover:underline">
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCajaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Nueva Caja</h3>
            <form action={crearCaja} className="space-y-4">
              <input name="nombre" placeholder="Nombre (ej: Caja 3)" required
                className="w-full border rounded-lg px-3 py-2" />
              <input name="ubicacion" placeholder="Ubicación"
                className="w-full border rounded-lg px-3 py-2" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCajaModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Nuevo Usuario</h3>
            <form action={crearUsuario} className="space-y-4">
              <input name="nombre" placeholder="Nombre completo" required
                className="w-full border rounded-lg px-3 py-2" />
              <input name="email" type="email" placeholder="Email" required
                className="w-full border rounded-lg px-3 py-2" />
              <input name="password" type="password" placeholder="Contraseña inicial" required minLength={8}
                className="w-full border rounded-lg px-3 py-2" />
              <input name="telefono" placeholder="Teléfono"
                className="w-full border rounded-lg px-3 py-2" />
              <select name="rol" required className="w-full border rounded-lg px-3 py-2">
                <option value="">Selecciona rol</option>
                <option value="ADMIN">Admin</option>
                <option value="CAJERA">Cajera</option>
                <option value="BODEGA">Bodega</option>
                <option value="COCINA">Cocina</option>
                <option value="DOMICILIARIO">Domiciliario</option>
              </select>
              <select name="caja_id" className="w-full border rounded-lg px-3 py-2">
                <option value="">Sin caja asignada</option>
                {cajas.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">La caja solo aplica para rol CAJERA</p>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
