export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: Date
  model?: string
  provider?: string
  error?: boolean
  tool_calls?: ToolCall[]
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool', content: string }>
  adminName?: string
  provider?: 'groq' | 'gemini' | 'openrouter'
}

export interface ChatResponse {
  reply: string
  model: string
  provider?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
