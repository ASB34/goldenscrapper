// DEPRECATED: Supabase client code removed
// The application now uses a PostgreSQL database and custom
// Prisma-style wrapper (`src/lib/prisma.ts`).
// These files are retained for historical reference but are
// no longer imported or executed anywhere in the codebase.

export interface PublishingLog {
  id: string
  product_id: string
  operation: string
  status: 'success' | 'error' | 'pending'
  details?: any
  error_message?: string
  created_at: string
  user_id: string
}

export interface UserSettings {
  id: string
  user_id: string
  prestashop_api_key?: string
  prestashop_store_url?: string
  openai_api_key?: string
  metals_api_key?: string
  markup_percentage?: number
  default_language: string
  created_at: string
  updated_at: string
}

export interface XauRate {
  id: string
  currency: string
  rate: number
  rate_per_oz: number
  source: string
  is_active: boolean
  fetched_at: string
  created_at: string
}

