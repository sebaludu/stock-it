import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStockReport, exportMovementsCSV } from '../api/reports'
import StockBadge from '../components/StockBadge'
import type { StockStatus } from '../types'
import { Download } from 'lucide-react'

export default function Reports() {
  const [filterStatus, setFilterStatus] = useState<string>('')
  const { data: report = [], isLoading } = useQuery({ queryKey: ['stock-report'], queryFn: getStockReport })

  const filtered = filterStatus ? report.filter((r) => r.stock_status === filterStatus) : report

  const counts = {
    CRITICO: report.filter((r) => r.stock_status === 'CRITICO').length,
    BAJO: report.filter((r) => r.stock_status === 'BAJO').length,
    MINIMO: report.filter((r) => r.stock_status === 'MINIMO').length,
    OK: report.filter((r) => r.stock_status === 'OK').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reporte de Stock</h2>
        <button onClick={exportMovementsCSV} className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          <Download size={16} /> Exportar movimientos CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(counts) as [StockStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`rounded-xl p-4 text-center transition-all ${filterStatus === status ? 'ring-2 ring-indigo-500' : ''} ${
              status === 'CRITICO' ? 'bg-red-50' :
              status === 'BAJO' ? 'bg-orange-50' :
              status === 'MINIMO' ? 'bg-yellow-50' : 'bg-emerald-50'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <StockBadge status={status} />
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Código', 'Tipo', 'Descripción', 'Stock actual', 'Stock seguridad', 'Diferencia', '% vs mínimo', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 ${item.stock_status === 'CRITICO' ? 'bg-red-50' : item.stock_status === 'BAJO' ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-medium text-indigo-600">{item.code}</td>
                  <td className="px-4 py-3">{item.asset_type_icon} {item.asset_type}</td>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className={`px-4 py-3 font-bold ${item.current_stock === 0 ? 'text-red-600' : item.current_stock < item.safety_stock ? 'text-orange-600' : 'text-gray-900'}`}>
                    {item.current_stock}
                  </td>
                  <td className="px-4 py-3">{item.safety_stock}</td>
                  <td className={`px-4 py-3 font-medium ${item.stock_diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.stock_diff >= 0 ? '+' : ''}{item.stock_diff}
                  </td>
                  <td className="px-4 py-3">
                    {item.stock_pct !== null ? (
                      <span className={item.stock_pct < 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {item.stock_pct >= 0 ? '+' : ''}{item.stock_pct}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3"><StockBadge status={item.stock_status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
