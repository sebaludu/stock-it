import { client } from './client'
import type { Asset, AssetType } from '../types'

export interface AssetFilters {
  asset_type_id?: number
  status?: string
  alert_only?: boolean
}

export interface AssetCreateData {
  description: string
  asset_type_id: number
  brand?: string
  model?: string
  safety_stock?: number
  status?: string
  purchase_date?: string
  notes?: string
  initial_stock?: number
}

export const getAssets = async (filters?: AssetFilters): Promise<Asset[]> => {
  const { data } = await client.get<Asset[]>('/assets', { params: filters })
  return data
}

export const getAsset = async (id: number): Promise<Asset> => {
  const { data } = await client.get<Asset>(`/assets/${id}`)
  return data
}

export const createAsset = async (payload: AssetCreateData): Promise<Asset> => {
  const { data } = await client.post<Asset>('/assets', payload)
  return data
}

export const updateAsset = async (id: number, payload: Partial<AssetCreateData>): Promise<Asset> => {
  const { data } = await client.put<Asset>(`/assets/${id}`, payload)
  return data
}

export const deleteAsset = async (id: number, reason: string): Promise<void> => {
  await client.delete(`/assets/${id}`, { params: { reason } })
}

export const getAssetTypes = async (): Promise<AssetType[]> => {
  const { data } = await client.get<AssetType[]>('/asset-types')
  return data
}

export const createAssetType = async (payload: { name: string; description?: string; icon?: string }): Promise<AssetType> => {
  const { data } = await client.post<AssetType>('/asset-types', payload)
  return data
}

export const deleteAssetType = async (id: number): Promise<void> => {
  await client.delete(`/asset-types/${id}`)
}
