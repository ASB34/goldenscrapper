// This file maintains compatibility with existing Prisma calls
// but redirects them to Supabase operations

import { supabaseAdmin } from './supabase'

// Compatibility wrapper to ease migration from Prisma to Supabase
export const prisma = {
  // Products operations
  product: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', where.id)
        .single()
      
      if (error) throw error
      return data
    },
    
    findMany: async (params?: any) => {
      console.log('🔍 Prisma→Supabase: product.findMany called with params:', JSON.stringify(params, null, 2));
      
      let query = supabaseAdmin.from('products').select('*')
      
      if (params?.where?.userId) {
        query = query.eq('user_id', params.where.userId)
      }
      if (params?.where?.user_id) {
        query = query.eq('user_id', params.where.user_id)
      }
      if (params?.where?.etsyId) {
        // Use etsy_listing_id field which exists in schema
        query = query.eq('etsy_listing_id', params.where.etsyId)
      }
      if (params?.where?.etsy_id) {
        // Use etsy_listing_id field which exists in schema
        query = query.eq('etsy_listing_id', params.where.etsy_id)
      }
      if (params?.where?.url) {
        // Use source_url field which exists in schema
        query = query.eq('source_url', params.where.url)
      }
      if (params?.orderBy?.createdAt) {
        const direction = params.orderBy.createdAt === 'desc' ? false : true
        query = query.order('created_at', { ascending: direction })
      }
      
      const { data, error } = await query
      if (error) {
        console.error('❌ Product findMany error:', error)
        throw error
      }
      
      console.log(`✅ Found ${data?.length || 0} products`);
      return data || []
    },
    
    create: async ({ data }: { data: any }) => {
      // Convert field names for Supabase compatibility
      const supabaseData = { ...data }
      
      // Map Prisma field names to Supabase column names for products
      console.log('🔄 Prisma→Supabase mapping - Input data keys:', Object.keys(data));
      if (supabaseData.userId) {
        console.log('🔄 Mapping userId:', supabaseData.userId, '→ user_id');
        supabaseData.user_id = supabaseData.userId
        delete supabaseData.userId
      }
      if (supabaseData.title) {
        supabaseData.original_title = supabaseData.title
        delete supabaseData.title
      }
      if (supabaseData.description) {
        supabaseData.original_description = supabaseData.description
        delete supabaseData.description
      }
      if (supabaseData.etsyId) {
        // Store as etsy_listing_id since etsy_id column doesn't exist
        supabaseData.etsy_listing_id = supabaseData.etsyId
        delete supabaseData.etsyId
      }
      if (supabaseData.url) {
        // Store as source_url since url column doesn't exist
        supabaseData.source_url = supabaseData.url
        delete supabaseData.url
      }
      if (supabaseData.originalTitle) {
        supabaseData.original_title = supabaseData.originalTitle
        supabaseData.title = supabaseData.originalTitle // Also map to title field
        delete supabaseData.originalTitle
      }
      if (supabaseData.originalDescription) {
        supabaseData.original_description = supabaseData.originalDescription
        supabaseData.description = supabaseData.originalDescription // Also map to description field
        delete supabaseData.originalDescription
      }
      if (supabaseData.originalKeywords) {
        supabaseData.original_keywords = supabaseData.originalKeywords
        delete supabaseData.originalKeywords
      }
      if (supabaseData.originalImages) {
        supabaseData.original_images = supabaseData.originalImages
        delete supabaseData.originalImages
      }
      if (supabaseData.originalVideos) {
        supabaseData.original_videos = supabaseData.originalVideos
        delete supabaseData.originalVideos
      }
      if (supabaseData.sourceUrl) {
        supabaseData.source_url = supabaseData.sourceUrl
        delete supabaseData.sourceUrl
      }
      if (supabaseData.xauPricing) {
        supabaseData.xau_pricing = supabaseData.xauPricing
        delete supabaseData.xauPricing
      }
      // Remove lastXauUpdate since this column doesn't exist in products table
      if (supabaseData.lastXauUpdate) {
        delete supabaseData.lastXauUpdate
      }
      if (supabaseData.aiRewrittenContent) {
        supabaseData.ai_rewritten_content = supabaseData.aiRewrittenContent
        delete supabaseData.aiRewrittenContent
      }
      if (supabaseData.isProcessed !== undefined) {
        supabaseData.is_processed = supabaseData.isProcessed
        delete supabaseData.isProcessed
      }
      if (supabaseData.isPublished !== undefined) {
        supabaseData.is_published = supabaseData.isPublished
        delete supabaseData.isPublished
      }
      if (supabaseData.publishedTo) {
        supabaseData.published_to = supabaseData.publishedTo
        delete supabaseData.publishedTo
      }
      
      const { data: result, error } = await supabaseAdmin
        .from('products')
        .insert(supabaseData)
        .select()
        .single()
      
      if (error) {
        console.error('Product create error:', error)
        throw error
      }
      return result
    },
    
    update: async ({ where, data }: { where: { id: string }, data: any }) => {
      // Convert field names for Supabase compatibility
      const supabaseData = { ...data }
      
      // Map Prisma field names to Supabase column names for products
      console.log('🔄 Prisma→Supabase mapping - Input data keys:', Object.keys(data));
      if (supabaseData.title) {
        supabaseData.original_title = supabaseData.title
        delete supabaseData.title
      }
      if (supabaseData.description) {
        supabaseData.original_description = supabaseData.description
        delete supabaseData.description
      }
      if (supabaseData.originalTitle) {
        supabaseData.original_title = supabaseData.originalTitle
        supabaseData.title = supabaseData.originalTitle // Also map to title field
        delete supabaseData.originalTitle
      }
      if (supabaseData.originalDescription) {
        supabaseData.original_description = supabaseData.originalDescription
        supabaseData.description = supabaseData.originalDescription // Also map to description field
        delete supabaseData.originalDescription
      }
      if (supabaseData.originalKeywords) {
        supabaseData.original_keywords = supabaseData.originalKeywords
        delete supabaseData.originalKeywords
      }
      if (supabaseData.originalImages) {
        supabaseData.original_images = supabaseData.originalImages
        delete supabaseData.originalImages
      }
      if (supabaseData.originalVideos) {
        supabaseData.original_videos = supabaseData.originalVideos
        delete supabaseData.originalVideos
      }
      if (supabaseData.sourceUrl) {
        supabaseData.source_url = supabaseData.sourceUrl
        delete supabaseData.sourceUrl
      }
      if (supabaseData.xauPricing) {
        supabaseData.xau_pricing = supabaseData.xauPricing
        delete supabaseData.xauPricing
      }
      // Remove lastXauUpdate since this column doesn't exist in products table
      if (supabaseData.lastXauUpdate) {
        delete supabaseData.lastXauUpdate
      }
      if (supabaseData.aiRewrittenContent) {
        supabaseData.ai_rewritten_content = supabaseData.aiRewrittenContent
        delete supabaseData.aiRewrittenContent
      }
      if (supabaseData.isProcessed !== undefined) {
        supabaseData.is_processed = supabaseData.isProcessed
        delete supabaseData.isProcessed
      }
      if (supabaseData.isPublished !== undefined) {
        supabaseData.is_published = supabaseData.isPublished
        delete supabaseData.isPublished
      }
      if (supabaseData.publishedTo) {
        supabaseData.published_to = supabaseData.publishedTo
        delete supabaseData.publishedTo
      }
      
      const { data: result, error } = await supabaseAdmin
        .from('products')
        .update(supabaseData)
        .eq('id', where.id)
        .select()
        .single()
      
      if (error) {
        console.error('Product update error:', error)
        throw error
      }
      return result
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', where.id)
      
      if (error) throw error
      return { id: where.id }
    }
  },

  // User settings operations (replacing apiKeys table)
  apiKeys: {
    findFirst: async (params?: any) => {
      let query = supabaseAdmin.from('user_settings').select('*')
      
      if (params?.where?.userId) {
        query = query.eq('user_id', params.where.userId)
      }
      
      const { data, error } = await query.limit(1).single()
      
      if (error && error.code !== 'PGRST116') throw error

      if (!data) return data

      // Normalize snake_case columns to camelCase for the application
      const normalized: any = { ...data }
      if (normalized.openai_api_key !== undefined) {
        normalized.openaiApiKey = normalized.openai_api_key
        // keep original for debugging if needed
      }
      if (normalized.prestashop_api_key !== undefined) {
        normalized.prestashopApiKey = normalized.prestashop_api_key
      }
      if (normalized.prestashop_store_url !== undefined) {
        normalized.prestashopStoreUrl = normalized.prestashop_store_url
      }
      if (normalized.encryption_key !== undefined) {
        normalized.encryptionKey = normalized.encryption_key
      }
      if (normalized.ai_provider !== undefined) {
        normalized.aiProvider = normalized.ai_provider
      }

      return normalized
    },
    
    create: async ({ data }: { data: any }) => {
      // Convert field names for Supabase compatibility
      const supabaseData = { ...data }
      
      // Map Prisma field names to Supabase column names
      if (supabaseData.userId) {
        supabaseData.user_id = supabaseData.userId
        delete supabaseData.userId
      }
      if (supabaseData.openaiApiKey) {
        supabaseData.openai_api_key = supabaseData.openaiApiKey
        delete supabaseData.openaiApiKey
      }
      if (supabaseData.prestashopApiKey) {
        supabaseData.prestashop_api_key = supabaseData.prestashopApiKey
        delete supabaseData.prestashopApiKey
      }
      if (supabaseData.prestashopStoreUrl) {
        supabaseData.prestashop_store_url = supabaseData.prestashopStoreUrl
        delete supabaseData.prestashopStoreUrl
      }
      // Remove fields that don't exist in user_settings table
      if (supabaseData.encryptionKey) {
        delete supabaseData.encryptionKey
      }
      // Persist aiProvider as ai_provider column in user_settings
      if (supabaseData.aiProvider !== undefined) {
        supabaseData.ai_provider = supabaseData.aiProvider
        delete supabaseData.aiProvider
      }
      
      const { data: result, error } = await supabaseAdmin
        .from('user_settings')
        .insert(supabaseData)
        .select()
        .single()
      
      if (error) throw error
      return result
    },
    
    update: async ({ where, data }: { where: { id: string }, data: any }) => {
      // Convert field names for Supabase compatibility
      const supabaseData = { ...data }
      
      // Map Prisma field names to Supabase column names
      if (supabaseData.userId) {
        supabaseData.user_id = supabaseData.userId
        delete supabaseData.userId
      }
      if (supabaseData.openaiApiKey) {
        supabaseData.openai_api_key = supabaseData.openaiApiKey
        delete supabaseData.openaiApiKey
      }
      if (supabaseData.prestashopApiKey) {
        supabaseData.prestashop_api_key = supabaseData.prestashopApiKey
        delete supabaseData.prestashopApiKey
      }
      if (supabaseData.prestashopStoreUrl) {
        supabaseData.prestashop_store_url = supabaseData.prestashopStoreUrl
        delete supabaseData.prestashopStoreUrl
      }
      if (supabaseData.encryptionKey) {
        // This field doesn't exist in user_settings table, remove it
        delete supabaseData.encryptionKey
      }
      // Persist aiProvider as ai_provider column in user_settings
      if (supabaseData.aiProvider !== undefined) {
        supabaseData.ai_provider = supabaseData.aiProvider
        delete supabaseData.aiProvider
      }
      
      const { data: result, error } = await supabaseAdmin
        .from('user_settings')
        .update(supabaseData)
        .eq('id', where.id)
        .select()
        .single()
      
      if (error) throw error
      return result
    },
    
    upsert: async ({ where, create, update }: any) => {
      // First try to find existing
      const { data: existing } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', where.user_id)
        .single()
      
      if (existing) {
        // Update existing
        const { data: result, error } = await supabaseAdmin
          .from('user_settings')
          .update(update)
          .eq('user_id', where.user_id)
          .select()
          .single()
        
        if (error) throw error
        return result
      } else {
        // Create new
        const { data: result, error } = await supabaseAdmin
          .from('user_settings')
          .insert(create)
          .select()
          .single()
        
        if (error) throw error
        return result
      }
    }
  },

  // User operations (if needed)
  user: {
    findUnique: async ({ where }: { where: { username?: string, id?: string } }) => {
      // This is handled by Supabase Auth, but keeping for compatibility
      return null
    },
    
    create: async ({ data }: { data: any }) => {
      // This is handled by Supabase Auth, but keeping for compatibility
      return null
    }
  },

  // XAU rates operations
  xauRates: {
    findMany: async (params?: any) => {
      let query = supabaseAdmin.from('xau_rates').select('*')
      
      // Remove is_active filter since this column doesn't exist
      // if (params?.where?.is_active) {
      //   query = query.eq('is_active', params.where.is_active)
      // }
      
      const { data, error } = await query.order('fetched_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    
    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabaseAdmin
        .from('xau_rates')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return result
    }
  },

  // Disconnect method (no-op for Supabase)
  $disconnect: async () => {
    // No need to disconnect from Supabase
  }
}
