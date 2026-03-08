import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Get or create Supabase client instance
 * This client uses the public anon key and is safe for client-side use
 */
export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided in environment variables')
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

  return supabaseClient
}

/**
 * Get Supabase client for server-side use with service role key
 * WARNING: This should only be used in server API routes
 */
export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and Service Key must be provided for server operations')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
