import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deactivateUser } from '../api/users'
import { getDeposits, getUserDeposits, addUserDeposit, removeUserDeposit } from '../api/deposits'
import type { User, UserRole } from '../types'
import { Plus, X, UserCheck, UserX, Warehouse, PlusCircle, MinusCircle } from 'lucide-react'

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        {children}
      </div>
    </div>
  )
}

function DepositsPanel({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [selectedDeposit, setSelectedDeposit] = useState('')

  const { data: allDeposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: getDeposits })
  const { data: userDeposits = [] } = useQuery({
    queryKey: ['user-deposits', user.id],
    queryFn: () => getUserDeposits(user.id),
  })

  const addMutation = useMutation({
    mutationFn: () => addUserDeposit(user.id, Number(selectedDeposit)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-deposits', user.id] }); setSelectedDeposit('') },
  })

  const removeMutation = useMutation({
    mutationFn: (depositId: number) => removeUserDeposit(user.id, depositId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-deposits', user.id] }),
  })

  const assignedIds = new Set(userDeposits.map((d) => d.id))
  const available = allDeposits.filter((d) => !assignedIds.has(d.id))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Depósitos de {user.full_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {userDeposits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin depósitos asignados</p>
          ) : (
            userDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Warehouse size={16} className="text-indigo-500" />
                  <span className="text-sm font-medium">{d.name}</span>
                  {d.location && <span className="text-xs text-gray-400">{d.location}</span>}
                </div>
                <button onClick={() => removeMutation.mutate(d.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Quitar acceso">
                  <MinusCircle size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {available.length > 0 && (
          <div className="flex gap-2 border-t border-gray-100 pt-4">
            <select
              value={selectedDeposit}
              onChange={(e) => setSelectedDeposit(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Agregar depósito...</option>
              {available.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button
              onClick={() => selectedDeposit && addMutation.mutate()}
              disabled={!selectedDeposit || addMutation.isPending}
              className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
            >
              <PlusCircle size={16} /> Agregar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Users() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [managingDeposits, setManagingDeposits] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', role: 'SOPORTE_IT' as UserRole })

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createMutation = useMutation({
    mutationFn: () => createUser({ ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false); setForm({ username: '', full_name: '', email: '', password: '', role: 'SOPORTE_IT' }) },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al crear el usuario')
    },
  })

  const toggleMutation = useMutation<void, Error, { id: number; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      if (is_active) {
        await deactivateUser(id)
      } else {
        await updateUser(id, { is_active: true })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Usuarios</h2>
        <button onClick={() => { setShowForm(true); setError('') }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Usuario', 'Nombre completo', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{u.username}</td>
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role === 'ADMIN' ? 'Administrador' : 'Soporte IT'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => setManagingDeposits(u)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Gestionar depósitos">
                      <Warehouse size={16} />
                    </button>
                  )}
                  <button onClick={() => toggleMutation.mutate({ id: u.id, is_active: u.is_active })} className="text-gray-400 hover:text-indigo-600 transition-colors" title={u.is_active ? 'Desactivar' : 'Activar'}>
                    {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuevo usuario</h3>
          <form onSubmit={(e) => { e.preventDefault(); setError(''); createMutation.mutate() }} className="space-y-3">
            {[
              { key: 'username', label: 'Usuario', type: 'text' },
              { key: 'full_name', label: 'Nombre completo', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'password', label: 'Contraseña', type: 'password' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
                <input type={type} value={(form as Record<string, string>)[key]} onChange={set(key)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select value={form.role} onChange={set('role')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="SOPORTE_IT">Soporte IT</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Creando...' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {managingDeposits && (
        <DepositsPanel user={managingDeposits} onClose={() => setManagingDeposits(null)} />
      )}
    </div>
  )
}
