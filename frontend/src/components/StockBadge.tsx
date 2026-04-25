import type { StockStatus } from '../types'

const config: Record<StockStatus, { label: string; className: string }> = {
  CRITICO: { label: 'Crítico', className: 'bg-red-100 text-red-800' },
  BAJO: { label: 'Bajo', className: 'bg-orange-100 text-orange-800' },
  MINIMO: { label: 'Mínimo', className: 'bg-yellow-100 text-yellow-800' },
  OK: { label: 'OK', className: 'bg-emerald-100 text-emerald-800' },
}

export default function StockBadge({ status }: { status: StockStatus }) {
  const { label, className } = config[status] ?? config.OK
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
