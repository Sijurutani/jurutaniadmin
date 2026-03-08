import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  const config = useRuntimeConfig()
  const admin = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    throw createError({ statusCode: 404, statusMessage: 'Auth user not found' })
  }

  const u = data.user
  return {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at,
    updated_at: u.updated_at ?? null,
    banned_until: (u as any).banned_until ?? null,
    identities: (u.identities ?? []).map(i => ({
      provider: i.provider,
      created_at: i.created_at ?? null
    }))
  }
})
