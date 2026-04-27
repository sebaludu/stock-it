import { client } from './client'
import type { StockReportItem, AssetDeletionLog, DepositAlert } from '../types'

export const getStockReport = async (): Promise<StockReportItem[]> => {
  const { data } = await client.get<StockReportItem[]>('/reports/stock')
  return data
}

export const getAlerts = async (): Promise<StockReportItem[]> => {
  const { data } = await client.get<StockReportItem[]>('/reports/alerts')
  return data
}

export const getDeletedAssetsLog = async (): Promise<AssetDeletionLog[]> => {
  const { data } = await client.get<AssetDeletionLog[]>('/reports/deleted-assets')
  return data
}

export const getAlertsByDeposit = async (): Promise<DepositAlert[]> => {
  const { data } = await client.get<DepositAlert[]>('/reports/alerts-by-deposit')
  return data
}

export const exportMovementsCSV = async (): Promise<void> => {
  const response = await client.get('/reports/movements/export', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
