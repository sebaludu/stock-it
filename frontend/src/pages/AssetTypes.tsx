import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssetTypes, createAssetType, deleteAssetType } from '../api/assets'
import { Plus, Trash2, X } from 'lucide-react'

const COMMON_ICONS = ['💻', '🖥️', '⌨️', '🖱️', '📱', '🖨️', '📷', '🎧', '🔌', '📺', '🖲️', '💾', '📡', '🔋', '🖧']

export default function AssetTypes() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '' })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const { data: types = [], isLoading } = useQuery({ queryKey: ['asset-types'], queryFn: getAssetTypes })

  const createMutation = useMutation({
    mutationFn: () => createAssetType({ name: form.name, description: form.description || undefined, icon: form.icon || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-types'] })
      setShowForm(false)
      setForm({ name: '', description: '', icon: '' })
      setError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al crear el tipo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAssetType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-types'] })
      setConfirmDelete(null)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg ?? 'No se puede eliminar el tipo')
      setConfirmDelete(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tipos de Activo</h2>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Nuevo tipo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Icono', 'Nombre', 'Descripción', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-2xl">{t.icon ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Eliminar tipo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay tipos de activo</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo tipo de activo</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Ej: Tablet"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Tablets y dispositivos similares"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${form.icon === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="O escribí un emoji directamente"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Eliminar tipo?</h3>
            <p className="text-gray-600 mb-4 text-sm">Solo se puede eliminar si no tiene activos asociados.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Eliminar
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
