import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMovements, createMovement } from '../api/movements'
import { getAssets } from '../api/assets'
import { getUsers } from '../api/users'
import { getDeposits } from '../api/deposits'
import { useAuthStore } from '../store/authStore'
import type { MovementType } from '../types'
import { Plus, X } from 'lucide-react'

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        {children}
      </div>
    </div>
  )
}

export default function Movements() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [filterAsset, setFilterAsset] = useState<string>('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    asset_id: '',
    movement_type: 'EGRESO' as MovementType,
    quantity: '1',
    reason: '',
    notes: '',
    target_user_id: '',
    deposit_id: '',
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['movements', filterType, filterAsset],
    queryFn: () => getMovements({
      movement_type: (filterType as MovementType) || undefined,
      asset_id: filterAsset ? Number(filterAsset) : undefined,
      limit: 100,
    }),
  })

  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => getAssets() })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: showForm })
  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: getDeposits, enabled: showForm })

  const mutation = useMutation({
    mutationFn: () => createMovement({
      asset_id: Number(form.asset_id),
      movement_type: form.movement_type,
      quantity: Number(form.quantity),
      reason: form.reason,
      notes: form.notes || undefined,
      target_user_id: form.target_user_id ? Number(form.target_user_id) : undefined,
      deposit_id: form.deposit_id ? Number(form.deposit_id) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['stock-report'] })
      qc.invalidateQueries({ queryKey: ['deposit-stock'] })
      setShowForm(false)
      setForm({ asset_id: '', movement_type: 'EGRESO', quantity: '1', reason: '', notes: '', target_user_id: '', deposit_id: '' })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al registrar el movimiento')
    },
  })

  const needsTarget = form.movement_type === 'EGRESO' || form.movement_type === 'DEVOLUCION'
  const movementTypes = user?.role === 'ADMIN'
    ? ['INGRESO', 'EGRESO', 'DEVOLUCION']
    : ['EGRESO', 'DEVOLUCION']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Movimientos</h2>
        <button onClick={() => { setShowForm(true); setError('') }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Todos los tipos</option>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
          <option value="DEVOLUCION">Devolución</option>
        </select>
        <select value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Todos los activos</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.description}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Fecha', 'Activo', 'Tipo', 'Cantidad', 'Motivo', 'Depósito', 'Operador', 'Destinatario'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(m.timestamp).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 font-mono text-indigo-600">{m.asset.code}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    m.movement_type === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' :
                    m.movement_type === 'EGRESO' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>{m.movement_type}</span>
                </td>
                <td className="px-4 py-3">{m.quantity}</td>
                <td className="px-4 py-3 max-w-xs truncate">{m.reason}</td>
                <td className="px-4 py-3 text-gray-500">{m.deposit_name ?? '—'}</td>
                <td className="px-4 py-3">{m.operator.full_name}</td>
                <td className="px-4 py-3">{m.target_user?.full_name ?? '—'}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar movimiento</h3>
          <form onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate() }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={form.movement_type} onChange={(e) => setForm((f) => ({ ...f, movement_type: e.target.value as MovementType }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {movementTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activo *</label>
              <select value={form.asset_id} onChange={(e) => setForm((f) => ({ ...f, asset_id: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.description} (stock: {a.current_stock})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
              <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {needsTarget && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.movement_type === 'EGRESO' ? 'Usuario destinatario *' : 'Usuario que devuelve *'}
                </label>
                <select value={form.target_user_id} onChange={(e) => setForm((f) => ({ ...f, target_user_id: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
              <select value={form.deposit_id} onChange={(e) => setForm((f) => ({ ...f, deposit_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sin depósito específico</option>
                {deposits.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={mutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {mutation.isPending ? 'Registrando...' : 'Registrar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
