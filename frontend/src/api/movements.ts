import { client } from './client'
import type { Movement, MovementType } from '../types'

export interface MovementFilters {
  asset_id?: number
  movement_type?: MovementType
  skip?: number
  limit?: number
}

export interface MovementCreateData {
  asset_id: number
  movement_type: MovementType
  quantity: number
  reason: string
  notes?: string
  target_user_name?: string
}

export const getMovements = async (filters?: MovementFilters): Promise<Movement[]> => {
  const { data } = await client.get<Movement[]>('/movements', { params: filters })
  return data
}

export const createMovement = async (payload: MovementCreateData): Promise<Movement> => {
  const { data } = await client.post<Movement>('/movements', payload)
  return data
}
