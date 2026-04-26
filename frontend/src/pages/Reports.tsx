import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStockReport, exportMovementsCSV, getDeletedAssetsLog } from '../api/reports'
import StockBadge from '../components/StockBadge'
import type { StockStatus } from '../types'
import { Download } from 'lucide-react'

type Tab = 'stock' | 'deleted'

export default function Reports() {
  const [tab, setTab] = useState<Tab>('stock')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data: report = [], isLoading: loadingStock } = useQuery({ queryKey: ['stock-report'], queryFn: getStockReport })
  const { data: deleted = [], isLoading: loadingDeleted } = useQuery({ queryKey: ['deleted-assets'], queryFn: getDeletedAssetsLog })

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
        <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
        {tab === 'stock' && (
          <button onClick={exportMovementsCSV} className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download size={16} /> Exportar movimientos CSV
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {([['stock', 'Stock actual'], ['deleted', 'Activos eliminados']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {key === 'deleted' && deleted.length > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">{deleted.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
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
            {loadingStock ? (
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
        </>
      )}

      {tab === 'deleted' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loadingDeleted ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Descripción', 'Tipo', 'Marca / Modelo', 'Stock final', 'Motivo', 'Eliminado por', 'Fecha'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deleted.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{item.asset_code}</td>
                    <td className="px-4 py-3">{item.asset_description}</td>
                    <td className="px-4 py-3">{item.asset_type_name}</td>
                    <td className="px-4 py-3 text-gray-500">{[item.brand, item.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3">{item.final_stock}</td>
                    <td className="px-4 py-3 text-gray-500">{item.reason ?? '—'}</td>
                    <td className="px-4 py-3">{item.deleted_by}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(item.deleted_at).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
                {deleted.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay activos eliminados</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
