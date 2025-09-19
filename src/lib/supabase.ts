import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// Types for our database tables
export interface Product {
  id: string
  etsy_id?: string
  original_title: string
  original_description: string
  original_keywords?: any
  original_images?: any
  original_videos?: any
  pricing?: any
  specifications?: any
  variants?: any
  category?: string
  vendor?: string
  sku?: string
  source_url?: string
  xau_pricing?: any
  last_xau_update?: string
  ai_rewritten_content?: any
  is_processed: boolean
  is_published: boolean
  published_to?: any
  created_at: string
  updated_at: string
  user_id: string
}

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

// Create Supabase client for client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create Supabase admin client for server-side operations
let supabaseAdmin: any;

try {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } else {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found - admin operations will fail');
    // Create a fallback that will throw clear errors
    supabaseAdmin = {
      from: () => {
        throw new Error('Supabase service role key required for this operation');
      },
      auth: {
        getUser: () => {
          throw new Error('Supabase service role key required for authentication operations');
        }
      }
    };
  }
} catch (error) {
  console.error('Failed to create Supabase admin client:', error);
}

export { supabaseAdmin };

// Server client factory for SSR
export const createSupabaseServerClient = (cookies: any) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}