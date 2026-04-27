import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAsset, deleteAsset } from '../api/assets'
import { getMovements } from '../api/movements'
import StockBadge from '../components/StockBadge'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, Edit, Trash2, X } from 'lucide-react'

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const assetId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showDelete, setShowDelete] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const { data: asset, isLoading } = useQuery({ queryKey: ['asset', assetId], queryFn: () => getAsset(assetId) })
  const { data: movements = [] } = useQuery({
    queryKey: ['movements', { asset_id: assetId }],
    queryFn: () => getMovements({ asset_id: assetId, limit: 50 }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(assetId, deleteReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      navigate('/assets')
    },
  })

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando...</div>
  if (!asset) return <div className="p-8 text-center text-red-500">Activo no encontrado</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/assets" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver a Activos
        </Link>
        {user?.role === 'ADMIN' && (
          <div className="flex gap-2">
            <Link to={`/assets/${id}/edit`} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              <Edit size={16} /> Editar
            </Link>
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{asset.code}</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{asset.description}</h2>
            <p className="text-gray-500">{asset.asset_type.icon} {asset.asset_type.name}</p>
            {asset.deposit && (
              <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
                <span className="font-medium">Depósito:</span> {asset.deposit.name}
                {asset.deposit.location && <span className="text-gray-400">— {asset.deposit.location}</span>}
              </p>
            )}
          </div>
          <StockBadge status={asset.stock_status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Stock actual', value: asset.current_stock, highlight: asset.current_stock < asset.safety_stock },
            { label: 'Stock seguridad', value: asset.safety_stock },
            { label: 'Cantidad total', value: asset.total_quantity },
            { label: 'Estado', value: asset.status },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold mt-1 ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>

        {(asset.brand || asset.model) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            {asset.brand && <div><span className="text-gray-500">Marca:</span> {asset.brand}</div>}
            {asset.model && <div><span className="text-gray-500">Modelo:</span> {asset.model}</div>}
          </div>
        )}

        {asset.notes && <p className="mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{asset.notes}</p>}
      </div>

      {asset.deposit_stocks && asset.deposit_stocks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Stock por depósito</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Depósito', 'Ubicación', 'Cantidad'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {asset.deposit_stocks.map((ds) => (
                <tr key={ds.deposit_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ds.deposit_name}</td>
                  <td className="px-4 py-3 text-gray-500">{ds.deposit_location ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{ds.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Historial de movimientos</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Fecha', 'Tipo', 'Cantidad', 'Motivo', 'Operador', 'Destinatario'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{new Date(m.timestamp).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    m.movement_type === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' :
                    m.movement_type === 'EGRESO' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>{m.movement_type}</span>
                </td>
                <td className="px-4 py-3 font-medium">{m.quantity}</td>
                <td className="px-4 py-3">{m.reason}</td>
                <td className="px-4 py-3">{m.operator.full_name}</td>
                <td className="px-4 py-3">{m.target_user_name ?? m.target_user?.full_name ?? '—'}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Eliminar activo</h3>
              <button onClick={() => setShowDelete(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-gray-600 mb-4">
              ¿Confirmas la eliminación de <strong>{asset.code} — {asset.description}</strong>?
              Esta acción quedará registrada en el log de auditoría.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ej: Equipo obsoleto, dado de baja..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
              <button onClick={() => setShowDelete(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
