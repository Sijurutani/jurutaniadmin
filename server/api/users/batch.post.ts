import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '~/types/database.types'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100)
})

export type BatchAuthUser = {
  display_name: string | null
  email: string | null
  email_confirmed: boolean
  last_sign_in_at: string | null
  banned_until: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  const config = useRuntimeConfig()
  const admin = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const results = await Promise.all(
    parsed.data.ids.map(id => admin.auth.admin.getUserById(id))
  )

  const map: Record<string, BatchAuthUser> = {}
  for (const { data } of results) {
    if (!data?.user) continue
    const u = data.user
    map[u.id] = {
      display_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.user_metadata?.display_name ?? null,
      email: u.email ?? null,
      email_confirmed: !!u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: (u as any).banned_until ?? null
    }
  }

  return map
})
