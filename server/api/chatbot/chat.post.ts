import { z } from 'zod'

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000)
})

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  adminName: z.string().max(100).optional(),
  useOpenRouter: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event)

  const result = chatRequestSchema.safeParse(rawBody)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
      data: result.error.issues
    })
  }

  const { messages, adminName, useOpenRouter } = result.data

  const systemPrompt = buildSystemPrompt(adminName)

  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages
  ]

  try {
    let aiResult

    if (useOpenRouter) {
      aiResult = await callOpenRouter(fullMessages)
    }
    else {
      aiResult = await callAI(fullMessages)
    }

    return {
      reply: aiResult.content,
      model: aiResult.model,
      usage: aiResult.usage
    }
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 503,
      statusMessage: 'AI service unavailable',
      message
    })
  }
})
