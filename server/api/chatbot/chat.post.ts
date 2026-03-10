import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'
import { CHAT_TOOLS, CORE_TOOLS, executeChatTool } from '../../utils/ai-tools'

// Simple in-memory rate limiting: 20 requests per user per minute
const rateLimitStore = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(userId)
  if (!record || now > record.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (record.count >= 20) return false
  record.count++
  return true
}

type Provider = 'gemini' | 'groq' | 'openrouter'
const FALLBACK_CHAIN: Provider[] = ['gemini', 'groq', 'openrouter']

function isFallbackError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  // 429 / quota exhausted
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('rate_limit')) return true
  // Groq / Anthropic tool_use_failed: model generated malformed function call (XML format instead of JSON)
  if (msg.includes('tool_use_failed') || msg.includes('Failed to call a function') || msg.includes('failed_generation')) return true
  // Generic 400 from tool incompatibility
  if (msg.includes('API error 400') && (msg.includes('tool') || msg.includes('function'))) return true
  // Invalid / deprecated model ID
  if (msg.includes('not a valid model') || msg.includes('model_not_found') || msg.includes('does not exist')) return true
  // Provider overloaded or upstream 503 (e.g. OpenRouter "Provider returned error")
  if (msg.includes('503') || msg.includes('overloaded') || msg.includes('Provider returned error')) return true
  return false
}

async function runWithProvider(
  event: import('h3').H3Event,
  fullMessages: import('../../../server/utils/ai').AIMessage[],
  provider: Provider,
  tools: Record<string, unknown>[]
): Promise<import('../../../server/utils/ai').AIResponse> {
  const working = [...fullMessages]
  let aiResult: import('../../../server/utils/ai').AIResponse | undefined
  let iters = 0
  const maxIters = 3

  while (iters < maxIters) {
    aiResult = await callAI(working, provider, tools)
    if (!aiResult.tool_calls || aiResult.tool_calls.length === 0) break
    working.push({
      role: 'assistant',
      content: aiResult.content || '',
      tool_calls: aiResult.tool_calls
    })
    for (const call of aiResult.tool_calls) {
      let output
      try {
        output = await executeChatTool(event, call.function.name, call.function.arguments)
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e)
        output = { error: 'Gagal menjalankan tool: ' + errMsg }
      }
      working.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(output)
      })
    }
    iters++
  }

  if (!aiResult) throw new Error('No result returned')
  return aiResult
}

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().max(10000),
  tool_calls: z.unknown().optional(),
  tool_call_id: z.string().optional()
})

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
  adminName: z.string().max(100).optional(),
  provider: z.enum(['groq', 'gemini', 'openrouter']).optional().default('gemini')
})

export default defineEventHandler(async (event) => {
  // Auth check — only authenticated users can use chatbot
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Rate limiting — 20 requests per user per minute
  if (!checkRateLimit(user.id)) {
    throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak permintaan. Coba lagi beberapa saat.' })
  }

  const rawBody = await readBody(event)

  const result = chatRequestSchema.safeParse(rawBody)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
      data: result.error.issues
    })
  }

  const { messages, adminName, provider } = result.data

  const systemPrompt = buildSystemPrompt(adminName)

  // Explicit typing for messages to avoid TypeScript errors
  const fullMessages: import('../../utils/ai').AIMessage[] = [
    { role: 'system', content: systemPrompt + '\nSebagai Asisten Jurutani, kamu bisa menggunakan tools untuk memanggil data profil, expert, instructor, dan harga pangan terkini dari Supabase DB!' },
    ...(messages as import('../../utils/ai').AIMessage[])
  ]

  let aiResult
  let usedProvider: Provider = provider

  // Build fallback chain: preferred provider first, then the rest
  const chain: Provider[] = [provider, ...FALLBACK_CHAIN.filter(p => p !== provider)]

  try {
    let lastError: unknown
    for (const prov of chain) {
      try {
        // Gemini supports all 22 tools; Groq & OpenRouter get a smaller subset
        // to prevent llama-based models from generating malformed XML function calls
        const tools = prov === 'gemini' ? CHAT_TOOLS : CORE_TOOLS
        aiResult = await runWithProvider(event, fullMessages, prov, tools)
        usedProvider = prov
        break
      } catch (e: unknown) {
        if (isFallbackError(e)) {
          console.warn(`[chatbot] ${prov} error (${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}), switching to next provider...`)
          lastError = e
          continue
        }
        throw e // non-retryable error, propagate immediately
      }
    }

    if (!aiResult) throw lastError ?? new Error('All AI providers exhausted')

    return {
      reply: aiResult.content || 'Tidak ada respons dari AI.',
      model: aiResult.model,
      provider: usedProvider,
      usage: aiResult.usage
    }
  } catch (err: unknown) {
    console.error('[chatbot] AI error:', err instanceof Error ? err.message : err)
    throw createError({
      statusCode: 503,
      statusMessage: 'Layanan AI sedang tidak tersedia. Coba lagi nanti.'
    })
  }
})
