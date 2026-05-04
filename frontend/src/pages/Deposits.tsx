import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDeposits, createDeposit, updateDeposit, deleteDeposit,
  getDepositStock, getTransfers, createTransfer,
} from '../api/deposits'
import { getAssets } from '../api/assets'
import type { Deposit, DepositEnvironment, DepositStockItem, DepositTransfer } from '../types'
import { Plus, X, Edit2, Trash2, ArrowLeftRight, Warehouse } from 'lucide-react'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

type Tab = 'deposits' | 'transfers'

export default function Deposits() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('deposits')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Deposit | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ name: '', description: '', location: '', environment: '' as DepositEnvironment | '', alert_email: '' })
  const [transferForm, setTransferForm] = useState({
    asset_id: '',
    from_deposit_id: '',
    to_deposit_id: '',
    quantity: '1',
    reason: '',
  })

  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: getDeposits })
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => getAssets() })
  const { data: transfers = [] } = useQuery({ queryKey: ['deposit-transfers'], queryFn: () => getTransfers() })

  const { data: depositStock = [] } = useQuery<DepositStockItem[]>({
    queryKey: ['deposit-stock', selectedDeposit?.id],
    queryFn: () => getDepositStock(selectedDeposit!.id),
    enabled: !!selectedDeposit,
  })

  const formPayload = () => ({
    name: form.name,
    description: form.description || undefined,
    location: form.location || undefined,
    environment: form.environment || undefined,
    alert_email: form.alert_email || undefined,
  })

  const resetForm = () => setForm({ name: '', description: '', location: '', environment: '', alert_email: '' })

  const createMutation = useMutation({
    mutationFn: () => createDeposit(formPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); setShowCreate(false); resetForm() },
    onError: (e: unknown) => setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al crear'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateDeposit(editing!.id, formPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); setEditing(null) },
    onError: (e: unknown) => setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDeposit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); if (selectedDeposit) setSelectedDeposit(null) },
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al eliminar'),
  })

  const transferMutation = useMutation({
    mutationFn: () => createTransfer({
      asset_id: Number(transferForm.asset_id),
      from_deposit_id: Number(transferForm.from_deposit_id),
      to_deposit_id: Number(transferForm.to_deposit_id),
      quantity: Number(transferForm.quantity),
      reason: transferForm.reason || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposit-transfers'] })
      qc.invalidateQueries({ queryKey: ['deposits'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['deposit-stock'] })
      setShowTransfer(false)
      setTransferForm({ asset_id: '', from_deposit_id: '', to_deposit_id: '', quantity: '1', reason: '' })
    },
    onError: (e: unknown) => setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al transferir'),
  })

  const openEdit = (dep: Deposit) => {
    setEditing(dep)
    setForm({ name: dep.name, description: dep.description ?? '', location: dep.location ?? '', environment: dep.environment ?? '', alert_email: dep.alert_email ?? '' })
    setError('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Depósitos</h2>
        <div className="flex gap-2">
          <button onClick={() => { setShowTransfer(true); setError('') }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
            <ArrowLeftRight size={16} /> Transferir
          </button>
          <button onClick={() => { setShowCreate(true); setError(''); resetForm() }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Nuevo depósito
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {([['deposits', 'Depósitos'], ['transfers', 'Historial de transferencias']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'deposits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {deposits.map((dep) => (
              <div
                key={dep.id}
                onClick={() => setSelectedDeposit(dep)}
                className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all border-2 ${selectedDeposit?.id === dep.id ? 'border-indigo-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Warehouse size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{dep.name}</p>
                        {dep.environment && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            dep.environment === 'PROD' ? 'bg-red-100 text-red-700' :
                            dep.environment === 'STAGE' ? 'bg-orange-100 text-orange-700' :
                            dep.environment === 'TEST' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{dep.environment}</span>
                        )}
                      </div>
                      {dep.location && <p className="text-sm text-gray-500">{dep.location}</p>}
                      {dep.description && <p className="text-xs text-gray-400 mt-0.5">{dep.description}</p>}
                      {dep.alert_email && <p className="text-xs text-indigo-500 mt-0.5">✉ {dep.alert_email}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(dep) }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar el depósito "${dep.name}"?`)) deleteMutation.mutate(dep.id) }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {deposits.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">No hay depósitos</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            {selectedDeposit ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Stock en {selectedDeposit.name}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Código', 'Descripción', 'Tipo', 'Cantidad'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {depositStock.map((s) => (
                      <tr key={s.asset_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-indigo-600">{s.asset_code}</td>
                        <td className="px-4 py-3">{s.asset_description}</td>
                        <td className="px-4 py-3 text-gray-500">{s.asset_type}</td>
                        <td className="px-4 py-3 font-semibold">{s.quantity}</td>
                      </tr>
                    ))}
                    {depositStock.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Sin stock en este depósito</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Warehouse size={40} className="mx-auto mb-2 opacity-30" />
                <p>Seleccioná un depósito para ver su stock</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'transfers' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Activo', 'Desde', 'Hacia', 'Cantidad', 'Motivo', 'Operador'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((t: DepositTransfer) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(t.timestamp).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-indigo-600">{t.asset_code}</span>
                    <span className="text-gray-500 ml-1 text-xs">{t.asset_description}</span>
                  </td>
                  <td className="px-4 py-3">{t.from_deposit_name}</td>
                  <td className="px-4 py-3">{t.to_deposit_name}</td>
                  <td className="px-4 py-3 font-semibold">{t.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{t.reason ?? '—'}</td>
                  <td className="px-4 py-3">{t.operator_name}</td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin transferencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(showCreate || editing) && (
        <Modal title={editing ? 'Editar depósito' : 'Nuevo depósito'} onClose={() => { setShowCreate(false); setEditing(null) }}>
          <form onSubmit={(e) => { e.preventDefault(); setError(''); editing ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
              <select value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value as DepositEnvironment | '' }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sin especificar</option>
                <option value="DEV">DEV — Desarrollo</option>
                <option value="TEST">TEST — Testing</option>
                <option value="STAGE">STAGE — Staging</option>
                <option value="PROD">PROD — Producción</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de alerta crítica</label>
              <input
                type="email"
                value={form.alert_email}
                onChange={(e) => setForm((f) => ({ ...f, alert_email: e.target.value }))}
                placeholder="alertas@empresa.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Se enviará un mail cuando el stock de un activo llegue a cero</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {editing ? 'Guardar' : 'Crear'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null) }} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {showTransfer && (
        <Modal title="Transferir stock entre depósitos" onClose={() => setShowTransfer(false)}>
          <form onSubmit={(e) => { e.preventDefault(); setError(''); transferMutation.mutate() }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activo *</label>
              <select value={transferForm.asset_id} onChange={(e) => setTransferForm((f) => ({ ...f, asset_id: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar activo...</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depósito origen *</label>
              <select value={transferForm.from_deposit_id} onChange={(e) => setTransferForm((f) => ({ ...f, from_deposit_id: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar origen...</option>
                {deposits.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depósito destino *</label>
              <select value={transferForm.to_deposit_id} onChange={(e) => setTransferForm((f) => ({ ...f, to_deposit_id: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar destino...</option>
                {deposits.filter((d) => String(d.id) !== transferForm.from_deposit_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
              <input type="number" min="1" value={transferForm.quantity} onChange={(e) => setTransferForm((f) => ({ ...f, quantity: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input value={transferForm.reason} onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={transferMutation.isPending} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {transferMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
              </button>
              <button type="button" onClick={() => setShowTransfer(false)} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
