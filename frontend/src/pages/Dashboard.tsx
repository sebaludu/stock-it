import { useQuery } from '@tanstack/react-query'
import { getStockReport } from '../api/reports'
import { getMovements } from '../api/movements'
import { getAssets } from '../api/assets'
import StockBadge from '../components/StockBadge'
import { AlertTriangle, Package, CheckCircle, ArrowLeftRight } from 'lucide-react'
import type { StockReportItem } from '../types'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: report = [] } = useQuery({ queryKey: ['stock-report'], queryFn: getStockReport })
  const { data: movements = [] } = useQuery({ queryKey: ['movements', { limit: 10 }], queryFn: () => getMovements({ limit: 10 }) })
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => getAssets() })

  const alerts = report.filter((r) => r.stock_status === 'CRITICO' || r.stock_status === 'BAJO')
  const today = new Date().toDateString()
  const todayMovements = movements.filter((m) => new Date(m.timestamp).toDateString() === today).length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de activos" value={assets.length} icon={Package} color="bg-indigo-500" />
        <StatCard label="Activos en alerta" value={alerts.length} icon={AlertTriangle} color="bg-red-500" />
        <StatCard label="Activos disponibles" value={assets.filter((a) => a.status === 'DISPONIBLE').length} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Movimientos hoy" value={todayMovements} icon={ArrowLeftRight} color="bg-amber-500" />
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">Activos que requieren atención</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Activo', 'Tipo', 'Stock Actual', 'Stock Seguridad', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((item: StockReportItem) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{item.code}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3">{item.asset_type_icon} {item.asset_type}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{item.current_stock}</td>
                    <td className="px-4 py-3">{item.safety_stock}</td>
                    <td className="px-4 py-3"><StockBadge status={item.stock_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Últimos movimientos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Activo', 'Tipo', 'Cantidad', 'Motivo', 'Operador'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(m.timestamp).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 font-mono">{m.asset.code}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.movement_type === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' :
                      m.movement_type === 'EGRESO' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{m.movement_type}</span>
                  </td>
                  <td className="px-4 py-3">{m.quantity}</td>
                  <td className="px-4 py-3 truncate max-w-xs">{m.reason}</td>
                  <td className="px-4 py-3">{m.operator.full_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
