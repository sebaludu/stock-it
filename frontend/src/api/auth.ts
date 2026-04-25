import { client } from './client'
import type { AuthToken, User } from '../types'

export const login = async (username: string, password: string): Promise<AuthToken> => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await client.post<AuthToken>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export const getMe = async (): Promise<User> => {
  const { data } = await client.get<User>('/auth/me')
  return data
}
