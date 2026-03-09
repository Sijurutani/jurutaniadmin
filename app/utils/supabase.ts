import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Get Supabase client for server-side use with service role key.
 * WARNING: Only use in server/api routes — never expose to client.
 */
export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  const supabaseServiceKey = config.supabaseServiceKey ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server operations')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
