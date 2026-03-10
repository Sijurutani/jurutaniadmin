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

export async function callGroq(
  messages: AIMessage[],
  model = 'llama3-groq-70b-8192-tool-use-preview',
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
  if (provider === 'groq') return await callGroq(messages, undefined, tools)
  if (provider === 'gemini') return await callGemini(messages, undefined, tools)
  if (provider === 'openrouter') return await callOpenRouter(messages, undefined, tools)

  throw new Error('Unknown AI provider')
}
