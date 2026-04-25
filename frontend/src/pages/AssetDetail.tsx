import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAsset } from '../api/assets'
import { getMovements } from '../api/movements'
import StockBadge from '../components/StockBadge'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, Edit } from 'lucide-react'

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const assetId = Number(id)

  const { data: asset, isLoading } = useQuery({ queryKey: ['asset', assetId], queryFn: () => getAsset(assetId) })
  const { data: movements = [] } = useQuery({
    queryKey: ['movements', { asset_id: assetId }],
    queryFn: () => getMovements({ asset_id: assetId, limit: 50 }),
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
          <Link to={`/assets/${id}/edit`} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Edit size={16} /> Editar
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{asset.code}</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{asset.description}</h2>
            <p className="text-gray-500">{asset.asset_type.icon} {asset.asset_type.name}</p>
          </div>
          <StockBadge status={asset.stock_status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Stock actual', value: asset.current_stock, highlight: asset.current_stock < asset.safety_stock },
            { label: 'Stock seguridad', value: asset.safety_stock, highlight: false },
            { label: 'Cantidad total', value: asset.total_quantity, highlight: false },
            { label: 'Estado', value: asset.status, highlight: false },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold mt-1 ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>

        {(asset.brand || asset.model || asset.serial_number) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
            {asset.brand && <div><span className="text-gray-500">Marca:</span> {asset.brand}</div>}
            {asset.model && <div><span className="text-gray-500">Modelo:</span> {asset.model}</div>}
            {asset.serial_number && <div><span className="text-gray-500">N° Serie:</span> {asset.serial_number}</div>}
          </div>
        )}

        {asset.notes && <p className="mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{asset.notes}</p>}
      </div>

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
                <td className="px-4 py-3">{m.target_user?.full_name ?? '—'}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
