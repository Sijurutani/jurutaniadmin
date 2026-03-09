import { serverSupabaseServiceRole } from '#supabase/server'
import * as z from 'zod'
import type { Database } from '~/types/database.types'

const bodySchema = z.object({
  action: z.enum(['ban', 'unban'])
})

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.errors })
  }

  const admin = serverSupabaseServiceRole<Database>(event)

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: parsed.data.action === 'ban' ? '876000h' : 'none'
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
