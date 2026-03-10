import { createSharedComposable } from '@vueuse/core'
import type { ChatMessage, ChatResponse } from '~/types/chatbot'

const STORAGE_KEY = 'jurutani_chatbot_history'
const MAX_HISTORY = 50

const _useChatbot = () => {
  const auth = useAuth()
  const isOpen = ref(false)
  const isLoading = ref(false)
  const messages = ref<ChatMessage[]>([])
  const error = ref<string | null>(null)
  const provider = ref<'groq' | 'gemini' | 'openrouter'>('gemini')

  const sessions = ref<Array<{ id: string, date: string, messages: ChatMessage[] }>>([])

  function loadSessionsList() {
    try {
      sessions.value = JSON.parse(localStorage.getItem('jurutani_chat_sessions') || '[]')
    } catch {
      sessions.value = []
    }
  }

  // Restore history from localStorage
  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        messages.value = parsed.map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }
      const storedProv = localStorage.getItem('jurutani_chatbot_provider')
      if (storedProv && ['groq', 'gemini', 'openrouter'].includes(storedProv)) {
        provider.value = storedProv as 'groq' | 'gemini' | 'openrouter'
      }
      loadSessionsList()
    } catch {
      /* ignore parse errors */
    }
  })

  watch(provider, (val) => {
    localStorage.setItem('jurutani_chatbot_provider', val)
  })

  function persistHistory() {
    try {
      const toStore = messages.value.slice(-MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      /* ignore storage errors */
    }
  }

  function clearHistory() {
    messages.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  function newChat() {
    if (messages.value.length > 0) {
      try {
        loadSessionsList()
        sessions.value.push({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          messages: [...messages.value]
        })
        localStorage.setItem('jurutani_chat_sessions', JSON.stringify(sessions.value))
      } catch {
        // ignore errors
      }
    }
    clearHistory()
  }

  function loadSession(id: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      if (messages.value.length > 0) newChat()
      messages.value = [...session.messages].map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      persistHistory()
      deleteSession(id)
    }
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    localStorage.setItem('jurutani_chat_sessions', JSON.stringify(sessions.value))
  }

  function addMessage(role: ChatMessage['role'], content: string, opts: Partial<ChatMessage> = {}): ChatMessage {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
      ...opts
    }
    messages.value.push(msg)
    persistHistory()
    return msg
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value) return

    error.value = null
    addMessage('user', content.trim())
    isLoading.value = true

    // Build history payload (last 10 messages, no system)
    const history = messages.value
      .filter(m => !m.error && m.role !== 'tool')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await $fetch<ChatResponse>('/api/chatbot/chat', {
        method: 'POST',
        body: {
          messages: history,
          adminName: auth.displayName,
          provider: provider.value
        }
      })

      addMessage('assistant', response.reply, { model: response.model, provider: response.provider })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi AI. Coba lagi.'
      addMessage('assistant', `⚠️ ${msg}`, { error: true })
      error.value = msg
    } finally {
      isLoading.value = false
    }
  }

  function open() {
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
  }
  function toggle() {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    isLoading,
    messages,
    error,
    provider,
    sessions,
    sendMessage,
    clearHistory,
    newChat,
    loadSession,
    deleteSession,
    open,
    close,
    toggle
  }
}

export const useChatbot = createSharedComposable(_useChatbot)
