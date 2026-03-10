export interface AIToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: AIToolCall[]
  tool_call_id?: string
}

export interface AIResponse {
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  tool_calls?: AIToolCall[]
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  messages: AIMessage[],
  model: string,
  extraHeaders: Record<string, string> = {},
  tools?: Record<string, unknown>[],
  extraBody: Record<string, unknown> = {}
): Promise<AIResponse> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
    ...extraBody
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const message = data.choices[0]?.message

  return {
    content: message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    tool_calls: (message?.tool_calls as AIToolCall[] | undefined)
  }
}

// Ordered model lists to try within each provider before giving up.
// Models are tried top-to-bottom; first success wins.
export const PROVIDER_MODELS: Record<'groq' | 'gemini' | 'openrouter', string[]> = {
  // All three support function/tool calling on free tier
  groq: [
    'llama-3.3-70b-versatile',   // best: tool-calling + large context
    'llama3-70b-8192',           // stable legacy fallback
    'llama-3.1-8b-instant'       // smallest & fastest, last resort
  ],
  // Gemini free tier — all 4 models support tools
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ],
  // OpenRouter free (:free) models that explicitly support tool_choice + tools.
  // Ordered by reliability — top models from the OpenRouter API as of March 2026.
  openrouter: [
    'openai/gpt-oss-120b:free',              // OpenAI open-weight 117B MoE, native tool use
    'qwen/qwen3-coder:free',                 // Qwen3 Coder 480B, optimized for tool calling
    'meta-llama/llama-3.3-70b-instruct:free', // well-tested, sometimes rate-limited
    'google/gemma-3-27b-it:free',            // Google, function calling support
    'nvidia/nemotron-3-nano-30b-a3b:free',   // NVIDIA MoE, tool_choice supported
    'qwen/qwen3-4b:free'                     // smallest fallback
  ]
}

function isModelFallbackError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('rate_limit')) return true
  if (msg.includes('tool_use_failed') || msg.includes('Failed to call a function') || msg.includes('failed_generation')) return true
  if (msg.includes('API error 400') && (msg.includes('tool') || msg.includes('function'))) return true
  if (msg.includes('not a valid model') || msg.includes('model_not_found') || msg.includes('does not exist')) return true
  if (msg.includes('503') || msg.includes('overloaded') || msg.includes('Provider returned error')) return true
  // OpenRouter: free model requires data-policy opt-in in account settings
  if (msg.includes('API error 404') || msg.includes('data policy') || msg.includes('No endpoints found')) return true
  return false
}

export async function callGroq(
  messages: AIMessage[],
  model = 'llama-3.3-70b-versatile',
  tools?: Record<string, unknown>[]
): Promise<AIResponse> {
  const config = useRuntimeConfig()
  if (!config.groqApiKey) throw new Error('GROQ_API_KEY is not configured')

  return callOpenAICompatible(
    'https://api.groq.com/openai/v1',
    config.groqApiKey,
    messages,
    model,
    {},
    tools
  )
}

export async function callGemini(
  messages: AIMessage[],
  model = 'gemini-2.5-flash',
  tools?: Record<string, unknown>[]
): Promise<AIResponse> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  return callOpenAICompatible(
    'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey,
    messages,
    model,
    {},
    tools
  )
}

export async function callOpenRouter(
  messages: AIMessage[],
  model = 'meta-llama/llama-3.3-70b-instruct:free',
  tools?: Record<string, unknown>[]
): Promise<AIResponse> {
  const config = useRuntimeConfig()
  if (!config.openrouterApiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  return callOpenAICompatible(
    'https://openrouter.ai/api/v1',
    config.openrouterApiKey,
    messages,
    model,
    {
      'HTTP-Referer': 'https://admin.jurutani.com',
      'X-Title': 'Jurutani Admin'
    },
    tools,
    // Let OpenRouter auto-route to an available provider if the primary is down
    { provider: { allow_fallbacks: true, order: ['Fireworks', 'Together', 'Lepton'] } }
  )
}

export async function callAI(
  messages: AIMessage[],
  provider: 'groq' | 'gemini' | 'openrouter' = 'gemini',
  tools?: Record<string, unknown>[]
): Promise<AIResponse> {
  const models = PROVIDER_MODELS[provider]
  let lastError: unknown

  for (const model of models) {
    try {
      if (provider === 'groq') return await callGroq(messages, model, tools)
      if (provider === 'gemini') return await callGemini(messages, model, tools)
      if (provider === 'openrouter') return await callOpenRouter(messages, model, tools)
    } catch (e: unknown) {
      if (isModelFallbackError(e)) {
        console.warn(`[ai] ${provider}/${model} failed (${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}), trying next model...`)
        lastError = e
        continue
      }
      throw e
    }
  }

  throw lastError ?? new Error(`All models exhausted for provider: ${provider}`)
}
