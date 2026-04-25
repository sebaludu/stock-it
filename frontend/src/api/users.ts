import { client } from './client'
import type { User, UserRole } from '../types'

export interface UserCreateData {
  username: string
  full_name: string
  email: string
  password: string
  role: UserRole
}

export const getUsers = async (): Promise<User[]> => {
  const { data } = await client.get<User[]>('/users')
  return data
}

export const createUser = async (payload: UserCreateData): Promise<User> => {
  const { data } = await client.post<User>('/users', payload)
  return data
}

export const updateUser = async (id: number, payload: Partial<UserCreateData & { is_active: boolean }>): Promise<User> => {
  const { data } = await client.put<User>(`/users/${id}`, payload)
  return data
}

export const deactivateUser = async (id: number): Promise<void> => {
  await client.delete(`/users/${id}`)
}
