export type UserRole = 'ADMIN' | 'SOPORTE_IT'
export type AssetStatus = 'DISPONIBLE' | 'ASIGNADO' | 'REPARACION' | 'DAÑADO' | 'PERDIDO'
export type MovementType = 'INGRESO' | 'EGRESO' | 'DEVOLUCION'
export type StockStatus = 'CRITICO' | 'BAJO' | 'MINIMO' | 'OK'

export interface User {
  id: number
  username: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AssetType {
  id: number
  name: string
  description: string | null
  icon: string | null
  created_at: string
}

export interface AssetDeletionLog {
  id: number
  asset_code: string
  asset_description: string
  asset_type_name: string
  brand: string | null
  model: string | null
  total_quantity: number
  final_stock: number
  reason: string | null
  deleted_by: string
  deleted_at: string
}

export interface Asset {
  id: number
  code: string
  description: string
  asset_type_id: number
  asset_type: AssetType
  brand: string | null
  model: string | null
  total_quantity: number
  current_stock: number
  safety_stock: number
  status: AssetStatus
  stock_status: StockStatus
  purchase_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Movement {
  id: number
  asset_id: number
  asset: Asset
  movement_type: MovementType
  quantity: number
  reason: string
  notes: string | null
  operator_user_id: number
  operator: User
  target_user_id: number | null
  target_user: User | null
  timestamp: string
}

export interface StockReportItem {
  id: number
  code: string
  description: string
  asset_type: string
  asset_type_icon: string | null
  current_stock: number
  safety_stock: number
  total_quantity: number
  status: AssetStatus
  stock_status: StockStatus
  stock_diff: number
  stock_pct: number | null
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}
