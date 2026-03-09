import { serverSupabaseServiceRole } from '#supabase/server'
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

  const admin = serverSupabaseServiceRole<Database>(event)
  const ids = parsed.data.ids

  // Satu call listUsers — lebih efisien dari N individual getUserById calls
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const idSet = new Set(ids)
  const map: Record<string, BatchAuthUser> = {}

  for (const u of data.users) {
    if (!idSet.has(u.id)) continue
    map[u.id] = {
      display_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.user_metadata?.display_name ?? null,
      email: u.email ?? null,
      email_confirmed: !!u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: (u as { banned_until?: string }).banned_until ?? null
    }
  }

  return map
})
