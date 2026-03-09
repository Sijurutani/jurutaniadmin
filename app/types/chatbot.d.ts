export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
  error?: boolean
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  adminName?: string
  useOpenRouter?: boolean
}

export interface ChatResponse {
  reply: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
