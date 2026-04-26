import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAssets, getAssetTypes } from '../api/assets'
import StockBadge from '../components/StockBadge'
import { useAuthStore } from '../store/authStore'
import { Plus, Eye } from 'lucide-react'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'REPARACION', label: 'En reparación' },
  { value: 'DAÑADO', label: 'Dañado' },
  { value: 'PERDIDO', label: 'Perdido' },
]

export default function Assets() {
  const user = useAuthStore((s) => s.user)
  const [typeId, setTypeId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [alertOnly, setAlertOnly] = useState(false)
  const [search, setSearch] = useState('')

  const { data: types = [] } = useQuery({ queryKey: ['asset-types'], queryFn: getAssetTypes })
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', typeId, status, alertOnly],
    queryFn: () => getAssets({
      asset_type_id: typeId ? Number(typeId) : undefined,
      status: status || undefined,
      alert_only: alertOnly || undefined,
    }),
  })

  const filtered = assets.filter((a) =>
    !search || a.description.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Activos</h2>
        {user?.role === 'ADMIN' && (
          <Link to="/assets/new" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Nuevo Activo
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Todos los tipos</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={alertOnly} onChange={(e) => setAlertOnly(e.target.checked)} className="rounded" />
          Solo alertas
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Código', 'Tipo', 'Descripción', 'Stock / Seguridad', 'Estado', 'Stock', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-600">{a.code}</td>
                  <td className="px-4 py-3">{a.asset_type.icon} {a.asset_type.name}</td>
                  <td className="px-4 py-3">
                    <div>{a.description}</div>
                    {a.brand && <div className="text-xs text-gray-400">{a.brand} {a.model}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={a.current_stock < a.safety_stock ? 'text-red-600 font-bold' : ''}>{a.current_stock}</span>
                    <span className="text-gray-400"> / {a.safety_stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{a.status}</span>
                  </td>
                  <td className="px-4 py-3"><StockBadge status={a.stock_status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a.id}`} className="text-indigo-600 hover:text-indigo-800">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay activos para mostrar</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Suppress unused import warning
type _AssetStatus = AssetStatus
