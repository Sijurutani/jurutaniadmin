export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  messages: AIMessage[],
  model: string,
  extraHeaders: Record<string, string> = {}
): Promise<AIResponse> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  }
}

export async function callGroq(
  messages: AIMessage[],
  model = 'llama-3.3-70b-versatile'
): Promise<AIResponse> {
  const config = useRuntimeConfig()
  if (!config.groqApiKey) throw new Error('GROQ_API_KEY is not configured')

  return callOpenAICompatible(
    'https://api.groq.com/openai/v1',
    config.groqApiKey,
    messages,
    model
  )
}

export async function callOpenRouter(
  messages: AIMessage[],
  model = 'google/gemini-2.0-flash'
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
    }
  )
}

/**
 * Call AI with automatic fallback: Groq first, OpenRouter as fallback.
 */
export async function callAI(messages: AIMessage[]): Promise<AIResponse> {
  const config = useRuntimeConfig()

  if (config.groqApiKey) {
    try {
      return await callGroq(messages)
    }
    catch (err) {
      console.warn('[ai] Groq failed, trying OpenRouter:', err)
    }
  }

  if (config.openrouterApiKey) {
    return await callOpenRouter(messages)
  }

  throw new Error('No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env')
}
