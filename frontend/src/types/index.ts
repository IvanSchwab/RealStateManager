// User types
export interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'manager' | 'employee'
  created_at: string
  updated_at: string
}

// Property types
export interface Property {
  id: string
  name: string
  type: 'apartment' | 'house' | 'commercial' | 'land'
  address: string
  city: string
  state: string
  zip_code: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  rent_amount: number
  status: 'available' | 'rented' | 'maintenance'
  description?: string
  created_at: string
  updated_at: string
}

// Tenant types
export interface Tenant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// Contract types
export interface Contract {
  id: string
  property_id: string
  tenant_id: string
  start_date: string
  end_date: string
  rent_amount: number
  deposit_amount: number
  payment_day: number
  status: 'active' | 'expired' | 'pending' | 'terminated'
  terms?: string
  created_at: string
  updated_at: string
  // Relations
  property?: Property
  tenant?: Tenant
}

// Payment types
export interface Payment {
  id: string
  contract_id: string
  amount: number
  due_date: string
  paid_date?: string
  payment_method?: 'cash' | 'check' | 'transfer' | 'card'
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  contract?: Contract
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
