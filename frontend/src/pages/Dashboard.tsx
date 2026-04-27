import { useQuery } from '@tanstack/react-query'
import { getStockReport, getAlertsByDeposit } from '../api/reports'
import { getMovements } from '../api/movements'
import { getAssets } from '../api/assets'
import StockBadge from '../components/StockBadge'
import { AlertTriangle, Package, CheckCircle, ArrowLeftRight, Warehouse } from 'lucide-react'
import type { DepositAlert } from '../types'

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
  const { data: alertsByDeposit = [] } = useQuery({ queryKey: ['alerts-by-deposit'], queryFn: getAlertsByDeposit })

  const totalAlerts = report.filter((r) => r.stock_status === 'CRITICO' || r.stock_status === 'BAJO').length
  const today = new Date().toDateString()
  const todayMovements = movements.filter((m) => new Date(m.timestamp).toDateString() === today).length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de activos" value={assets.length} icon={Package} color="bg-indigo-500" />
        <StatCard label="Activos en alerta" value={totalAlerts} icon={AlertTriangle} color="bg-red-500" />
        <StatCard label="Activos disponibles" value={assets.filter((a) => a.status === 'DISPONIBLE').length} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Movimientos hoy" value={todayMovements} icon={ArrowLeftRight} color="bg-amber-500" />
      </div>

      {alertsByDeposit.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Alertas de stock por depósito</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alertsByDeposit.map((group: DepositAlert) => (
              <div key={group.deposit_id ?? 'none'} className="bg-white rounded-xl shadow-sm overflow-hidden border border-red-100">
                <div className="px-4 py-3 bg-red-50 flex items-center gap-2 border-b border-red-100">
                  <Warehouse size={16} className="text-red-500" />
                  <div>
                    <span className="font-semibold text-gray-900">{group.deposit_name}</span>
                    {group.deposit_location && (
                      <span className="text-xs text-gray-500 ml-2">{group.deposit_location}</span>
                    )}
                  </div>
                  <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {group.alerts.length} alerta{group.alerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Código', 'Activo', 'Stock', 'Seguridad', 'Estado'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.alerts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-indigo-600">{a.code}</td>
                        <td className="px-4 py-2.5 text-gray-700">{a.description}</td>
                        <td className="px-4 py-2.5 font-bold text-red-600">{a.current_stock}</td>
                        <td className="px-4 py-2.5 text-gray-500">{a.safety_stock}</td>
                        <td className="px-4 py-2.5"><StockBadge status={a.stock_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
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
