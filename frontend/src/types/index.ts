export type UserRole = 'ADMIN' | 'SOPORTE_IT'
export type AssetStatus = 'DISPONIBLE' | 'ASIGNADO' | 'REPARACION' | 'DAÑADO' | 'PERDIDO'
export type MovementType = 'INGRESO' | 'EGRESO' | 'DEVOLUCION'
export type StockStatus = 'CRITICO' | 'BAJO' | 'MINIMO' | 'OK'

export interface Deposit {
  id: number
  name: string
  description: string | null
  location: string | null
  is_active: boolean
  created_at: string
}

export interface AssetDepositStock {
  deposit_id: number
  deposit_name: string
  deposit_location: string | null
  quantity: number
}

export interface DepositTransfer {
  id: number
  asset_id: number
  asset_code: string
  asset_description: string
  from_deposit_id: number
  from_deposit_name: string
  to_deposit_id: number
  to_deposit_name: string
  quantity: number
  reason: string | null
  operator_name: string
  timestamp: string
}

export interface DepositStockItem {
  asset_id: number
  asset_code: string
  asset_description: string
  asset_type: string
  quantity: number
}

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
  deposit_id: number | null
  deposit: { id: number; name: string; location: string | null } | null
  deposit_stocks?: AssetDepositStock[]
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
  target_user_name: string | null
  deposit_id: number | null
  deposit_name: string | null
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

export interface DepositAlert {
  deposit_id: number | null
  deposit_name: string
  deposit_location: string | null
  alerts: {
    id: number
    code: string
    description: string
    asset_type: string
    current_stock: number
    safety_stock: number
    stock_status: StockStatus
  }[]
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}
