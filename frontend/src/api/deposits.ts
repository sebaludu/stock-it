import { client } from './client'
import type { Deposit, DepositTransfer, DepositStockItem } from '../types'

export interface DepositCreateData {
  name: string
  description?: string
  location?: string
}

export interface TransferCreateData {
  asset_id: number
  from_deposit_id: number
  to_deposit_id: number
  quantity: number
  reason?: string
}

export const getDeposits = async (): Promise<Deposit[]> => {
  const { data } = await client.get<Deposit[]>('/deposits')
  return data
}

export const createDeposit = async (payload: DepositCreateData): Promise<Deposit> => {
  const { data } = await client.post<Deposit>('/deposits', payload)
  return data
}

export const updateDeposit = async (id: number, payload: Partial<DepositCreateData>): Promise<Deposit> => {
  const { data } = await client.put<Deposit>(`/deposits/${id}`, payload)
  return data
}

export const deleteDeposit = async (id: number): Promise<void> => {
  await client.delete(`/deposits/${id}`)
}

export const getDepositStock = async (id: number): Promise<DepositStockItem[]> => {
  const { data } = await client.get<DepositStockItem[]>(`/deposits/${id}/stock`)
  return data
}

export const getTransfers = async (params?: { asset_id?: number; deposit_id?: number }): Promise<DepositTransfer[]> => {
  const { data } = await client.get<DepositTransfer[]>('/deposit-transfers', { params })
  return data
}

export const createTransfer = async (payload: TransferCreateData): Promise<DepositTransfer> => {
  const { data } = await client.post<DepositTransfer>('/deposit-transfers', payload)
  return data
}

export const getUserDeposits = async (userId: number): Promise<{ id: number; name: string; location: string | null }[]> => {
  const { data } = await client.get(`/users/${userId}/deposits`)
  return data
}

export const addUserDeposit = async (userId: number, depositId: number): Promise<void> => {
  await client.post(`/users/${userId}/deposits`, { deposit_id: depositId })
}

export const removeUserDeposit = async (userId: number, depositId: number): Promise<void> => {
  await client.delete(`/users/${userId}/deposits/${depositId}`)
}
